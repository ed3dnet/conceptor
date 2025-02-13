import {
  BadRequestError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Redis } from "ioredis";
import {
  type Configuration as OIDCClientConfiguration,
  buildAuthorizationUrl,
  customFetch,
  discovery,
} from "openid-client";
import { V3 } from "paseto";
import { type Logger } from "pino";

import { type UrlsConfig } from "../../_config/types.js";
import { type Drizzle } from "../../lib/datastores/postgres/types.server.js";
import { type VaultService } from "../../lib/functional/vault/service.js";
import { type OIDCConnectorState } from "../auth-connectors/schemas/index.js";
import { type AuthConnectorService } from "../auth-connectors/service.js";

import { type AuthConfig } from "./config.js";
import { OAuthStateChecker, type OAuthState } from "./schemas.js";

export class AuthService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly fetch: FetchFn,
    private readonly authConfig: AuthConfig,
    private readonly urlsConfig: UrlsConfig,
    private readonly redis: Redis,
    private readonly vault: VaultService,
    private readonly authConnectors: AuthConnectorService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  private async createStateToken(
    payload: Omit<OAuthState, "nonce">,
  ): Promise<string> {
    const token: OAuthState = {
      ...payload,
      nonce: crypto.randomUUID(),
    };
    return V3.encrypt(
      token,
      this.authConfig.oauth.statePasetoSymmetricKey.key,
      {
        expiresIn: `${this.authConfig.oauth.stateExpirationSeconds}s`,
      },
    );
  }

  private async decryptStateToken(
    tokenCiphertext: string,
  ): Promise<OAuthState> {
    try {
      const ret = V3.decrypt(
        tokenCiphertext,
        this.authConfig.oauth.statePasetoSymmetricKey.key,
      );

      return OAuthStateChecker.Decode(ret);
    } catch (err) {
      this.logger.warn(
        { fn: this.decryptStateToken.name, err },
        "Failed to decrypt state token",
      );
      throw err;
    }
  }

  async createOAuthState(
    tenantId: string,
    authConnectorId: string,
    redirectUri: string,
  ): Promise<string> {
    const state: OAuthState = {
      tenantId,
      authConnectorId,
      nonce: crypto.randomUUID(),
      redirectUri,
    };

    return this.createStateToken(state);
  }

  async verifyOAuthState(stateToken: string): Promise<OAuthState> {
    const payload = await this.decryptStateToken(stateToken);

    const usedKey = `oauth:state:${payload.nonce}`;
    const wasUsed = await this.redis.get(usedKey);
    if (wasUsed) {
      throw new BadRequestError("OAuth state already used");
    }
    await this.redis.set(
      usedKey,
      "1",
      "EX",
      this.authConfig.oauth.stateExpirationSeconds,
    );

    return payload;
  }

  private async getClientConfig(
    connectorState: OIDCConnectorState,
  ): Promise<OIDCClientConfiguration> {
    const oidcConfig: OIDCClientConfiguration = await discovery(
      new URL(connectorState.settings.configurationUrl),
      connectorState.settings.clientId,
      {
        client_secret: connectorState.settings.clientSecret,
      },
      undefined,
      {
        [customFetch]: this.fetch,
      },
    );

    return oidcConfig;
  }

  async initiateOAuthFlow(
    tenantId: string,
    authConnectorId: string,
    redirectUri: string,
  ): Promise<URL> {
    const logger = this.logger.child({
      fn: this.initiateOAuthFlow.name,
      tenantId,
      authConnectorId,
    });
    const connector = await this.authConnectors.getById(authConnectorId);
    if (!connector) {
      throw new NotFoundError("Auth connector not found");
    }
    const connectorState = await this.vault.decrypt(connector.state);
    const oidcConfig = await this.getClientConfig(connectorState);

    const params = new URLSearchParams({
      // TODO: redirect _for the API_, not the redirect URI we're getting for the user side. we'll redirect that.
      redirect_uri: redirectUri,
      response_type: "code",
      scope: connectorState.settings.scopes.join(" "),
      state: await this.createStateToken({
        tenantId,
        authConnectorId,
        redirectUri,
      }),
    });

    return buildAuthorizationUrl(oidcConfig, params);
  }

  async handleOAuthCallback(
    expectedTenantId: string,
    expectedAuthConnectorId: string,
    code: string,
    state: string,
  ): Promise<void> {
    const logger = this.logger.child({
      fn: this.handleOAuthCallback.name,
    });
    const verifiedState = await this.verifyOAuthState(state);

    if (verifiedState.tenantId !== expectedTenantId) {
      throw new BadRequestError("Invalid tenant ID in state");
    }

    if (verifiedState.authConnectorId !== expectedAuthConnectorId) {
      throw new BadRequestError("Invalid auth connector ID in state");
    }

    const connector = await this.authConnectors.getById(
      verifiedState.authConnectorId,
    );
    if (!connector) {
      throw new NotFoundError("Auth connector not found");
    }

    const connectorState = await this.vault.decrypt(connector.state);
    const oidcConfig = await this.getClientConfig(connectorState);

    // TODO:  go build an employee service. then use it here to generate a session token and return it. or use a paseto
  }
}
