import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import cryptoRandomString from "crypto-random-string";
import { type FastifyRequest } from "fastify";
import { type Redis } from "ioredis";
import {
  type Configuration as OIDCClientConfiguration,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  customFetch,
  discovery,
  fetchUserInfo,
  randomPKCECodeVerifier,
} from "openid-client";
import { V3 } from "paseto";
import { type Logger } from "pino";

import { type UrlsConfig } from "../../_config/types.js";
import { EMPLOYEE_SESSIONS } from "../../_db/schema/index.js";
import { type Drizzle } from "../../lib/datastores/postgres/types.server.js";
import { type VaultService } from "../../lib/functional/vault/service.js";
import { sha256 } from "../../lib/utils/cryptography.js";
import { type OIDCConnectorState } from "../auth-connectors/schemas/index.js";
import { type AuthConnectorService } from "../auth-connectors/service.js";
import { type EmployeeService } from "../employees/service.js";

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
    private readonly employees: EmployeeService,
    private readonly authConnectors: AuthConnectorService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  private async createStateToken(payload: OAuthState): Promise<string> {
    return V3.encrypt(
      payload,
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

    const codeChallengeMethod = "S256";
    const pkceVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(pkceVerifier);
    const nonce = crypto.randomUUID();

    const params = new URLSearchParams({
      redirect_uri:
        this.urlsConfig.apiBaseUrl +
        `/${tenantId}/auth/${authConnectorId}/callback`,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope: connectorState.settings.scopes.join(" "),
      state: await this.createStateToken({
        nonce,
        tenantId,
        authConnectorId,
        redirectUri,
        pkceVerifier,
      }),
    });

    return buildAuthorizationUrl(oidcConfig, params);
  }

  async createSessionRow(
    employeeId: string,
    tenantId: string,
    executor: Drizzle,
  ) {
    const token =
      "CPTR_V1_" + cryptoRandomString({ length: 32, type: "distinguishable" });
    const tokenHash = sha256(token);

    const [session] = await executor
      .insert(EMPLOYEE_SESSIONS)
      .values({
        employeeId,
        tenantId,
        tokenHash,
      })
      .returning();

    if (!session) {
      throw new InternalServerError("Failed to create session");
    }

    return { sessionId: session.sessionId, sessionToken: token };
  }

  async TX_handleOIDCCallback(
    expectedTenantId: string,
    expectedAuthConnectorId: string,
    state: string,
    originalUrl: URL,
  ): Promise<{ sessionId: string; sessionToken: string }> {
    let logger = this.logger.child({
      fn: this.TX_handleOIDCCallback.name,
      tenantId: expectedTenantId,
      authConnectorId: expectedAuthConnectorId,
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

    // TODO:  go build an employee service. then use it here to generate a session token and return it

    const tokenSet = await authorizationCodeGrant(oidcConfig, originalUrl, {
      idTokenExpected: true,
      expectedNonce: verifiedState.nonce,
      pkceCodeVerifier: verifiedState.pkceVerifier,
    });

    const claims = tokenSet.claims();

    if (!claims) {
      throw new BadRequestError("Bad ID token claims");
    }

    const userInfo = await fetchUserInfo(
      oidcConfig,
      tokenSet.access_token,
      claims.sub,
    );

    const email = userInfo.email;

    logger.info({ email }, "OIDC returned for email.");

    return this.db.transaction(async (tx) => {
      if (!email) {
        throw new BadRequestError(
          "No email found in user info; cannot match to employee record.",
        );
      }

      const employee = await this.employees.getByEmail(email);

      if (!employee) {
        throw new InternalServerError(
          "No employee found for email; cannot match to employee record.",
        );
      }

      logger = logger.child({ employeeId: employee.employeeId });
      logger.info({ email }, "Found employee for OIDC callback.");

      await this.employees.setEmployeeIdPUserInfo(employee.employeeId, {
        ...userInfo,
        email,
      });

      logger.debug("Updated employee record with latest IDP user info.");

      const tokenResult = await this.createSessionRow(
        employee.employeeId,
        employee.tenantId,
        tx,
      );

      logger.info({ sessionId: tokenResult.sessionId }, "Created session.");

      return tokenResult;
    });
  }
}
