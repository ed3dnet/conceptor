import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import cryptoRandomString from "crypto-random-string";
import { eq, gt, and, isNull } from "drizzle-orm";
import { type Redis } from "ioredis";
import ms from "ms";
import {
  type Configuration as OIDCClientConfiguration,
  allowInsecureRequests,
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

import {
  type InsecureOptionsConfig,
  type UrlsConfig,
} from "../../_config/types.js";
import { type DBUser } from "../../_db/models.js";
import { USER_SESSIONS, USERS } from "../../_db/schema/index.js";
import {
  type DrizzleRO,
  type Drizzle,
} from "../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../lib/ext/typebox/index.js";
import { type VaultService } from "../../lib/functional/vault/service.js";
import { sha256 } from "../../lib/utils/cryptography.js";
import {
  type AuthConnectorId,
  AuthConnectorIds,
} from "../auth-connectors/id.js";
import { type OIDCConnectorState } from "../auth-connectors/schemas/index.js";
import { type AuthConnectorService } from "../auth-connectors/service.js";
import { type TenantId, TenantIds } from "../tenants/id.js";
import { type UserId, UserIds } from "../users/id.js";
import { type UserService } from "../users/service.js";

import { type AuthConfig } from "./config.js";
import { OAuthStateChecker, type OAuthState } from "./schemas.js";

const TOKEN_HASH_ROUNDS = 4;
const TOKEN_EXPIRES_AFTER_MS = ms("16d");

export class AuthService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly fetch: FetchFn,
    private readonly authConfig: AuthConfig,
    private readonly urlsConfig: UrlsConfig,
    private readonly insecureOptions: InsecureOptionsConfig,
    private readonly redis: Redis,
    private readonly vault: VaultService,
    private readonly users: UserService,
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
    let ret: OAuthState;
    try {
      ret = await V3.decrypt(
        tokenCiphertext,
        this.authConfig.oauth.statePasetoSymmetricKey.key,
      );
    } catch (err) {
      this.logger.warn(
        { fn: this.decryptStateToken.name, err },
        "Failed to decrypt state token",
      );
      throw err;
    }

    try {
      return OAuthStateChecker.Decode(ret);
    } catch (err) {
      this.logger.warn(
        {
          fn: this.decryptStateToken.name,
          err,
          token: this.insecureOptions.allowInsecureOpenIDProviders
            ? ret
            : undefined,
          tokenCiphertext: this.insecureOptions.allowInsecureOpenIDProviders
            ? tokenCiphertext
            : undefined,
        },
        "Failed to validate state token",
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
        execute: this.insecureOptions.allowInsecureOpenIDProviders
          ? [allowInsecureRequests]
          : [],
      },
    );

    return oidcConfig;
  }

  async initiateOAuthFlow(
    tenantId: TenantId,
    authConnectorId: AuthConnectorId,
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

    // TODO:  in the future, enable PKCE where accepted
    //        this isn't high priority, as we are using an encrypted state token;
    //        but we should revisit this in the future because there is the risk of
    //        interception and replay.
    // const codeChallengeMethod = "S256";
    // const pkceVerifier = randomPKCECodeVerifier();
    // const codeChallenge = await calculatePKCECodeChallenge(pkceVerifier);
    const nonce = crypto.randomUUID();

    const params = new URLSearchParams({
      redirect_uri:
        this.urlsConfig.apiBaseUrl +
        `/${tenantId}/auth/${authConnectorId}/callback`,
      response_type: "code",
      // code_challenge: codeChallenge,
      // code_challenge_method: codeChallengeMethod,
      scope: connectorState.settings.scopes.join(" "),
      state: await this.createStateToken({
        nonce,
        tenantId: TenantIds.toRichId(tenantId),
        authConnectorId: AuthConnectorIds.toRichId(authConnectorId),
        redirectUri,
        // pkceVerifier,
      }),
    });

    return buildAuthorizationUrl(oidcConfig, params);
  }

  async createSessionRow(
    userId: UserId,
    tenantId: TenantId,
    executor: Drizzle,
  ) {
    const token =
      "CPTR_V1_" + cryptoRandomString({ length: 32, type: "distinguishable" });
    const tokenHash = sha256(token, TOKEN_HASH_ROUNDS);

    const [session] = await executor
      .insert(USER_SESSIONS)
      .values({
        userId: UserIds.toUUID(userId),
        tenantId: TenantIds.toUUID(tenantId),
        tokenHash,
      })
      .returning();

    if (!session) {
      throw new InternalServerError("Failed to create session");
    }

    return { sessionId: session.sessionId, sessionToken: token };
  }

  async resolveSessionTokenToUser(
    token: string,
    executor: Drizzle = this.db,
  ): Promise<DBUser | null> {
    const tokenHash = sha256(token, TOKEN_HASH_ROUNDS);
    const now = new Date();
    const expiredBefore = new Date(now.getTime() - TOKEN_EXPIRES_AFTER_MS);

    return executor.transaction(async (tx) => {
      const logger = this.logger.child({
        fn: this.resolveSessionTokenToUser.name,
      });

      const [session] = await tx
        .select()
        .from(USER_SESSIONS)
        .where(
          and(
            eq(USER_SESSIONS.tokenHash, tokenHash),
            isNull(USER_SESSIONS.revokedAt),
            gt(USER_SESSIONS.lastAccessedAt, expiredBefore),
          ),
        )
        .limit(1);

      if (!session) {
        return null;
      }

      const user = await this.users.getByUserUUID(session.userId);

      if (!user) {
        logger.warn(
          { sessionId: session.sessionId, userId: session.userId },
          "User not found for valid session.",
        );
        return null;
      }

      if (user.disabledAt) {
        logger.warn(
          { sessionId: session.sessionId, userId: session.userId },
          "User disabled.",
        );
        return null;
      }

      // Update session and user access times
      await tx
        .update(USER_SESSIONS)
        .set({ lastAccessedAt: now })
        .where(eq(USER_SESSIONS.sessionId, session.sessionId));

      await tx
        .update(USERS)
        .set({ lastAccessedAt: now })
        .where(eq(USERS.userId, user.userId));

      return user;
    });
  }

  async TX_handleOIDCCallback(
    expectedTenantId: string,
    expectedAuthConnectorId: AuthConnectorId,
    state: string,
    originalUrl: URL,
  ) {
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

    // NOTE: we remove `state` here because `openid-client` gets mad about it.
    originalUrl.searchParams.delete("state");

    const tokenSet = await authorizationCodeGrant(oidcConfig, originalUrl, {
      idTokenExpected: true,
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
          "No email found in user info; cannot match to user record.",
        );
      }

      const user = await this.users.getByEmail(email);

      if (!user) {
        throw new InternalServerError(
          "No user found for email; cannot match to user record.",
        );
      }

      logger = logger.child({ userId: user.userId });
      logger.info({ email }, "Found user for OIDC callback.");

      await this.users.setUserIdPUserInfo(UserIds.toRichId(user.userId), {
        ...userInfo,
        email,
      });

      logger.debug("Updated user record with latest IDP user info.");

      const tokenResult = await this.createSessionRow(
        UserIds.toRichId(user.userId),
        TenantIds.toRichId(user.tenantId),
        tx,
      );

      logger.info({ sessionId: tokenResult.sessionId }, "Created session.");

      // TODO: in the future we might need to support one-user-multiple-tenants
      return {
        sessionCookieName: this.authConfig.sessionCookie.name,
        ...tokenResult,
        redirectTo:
          verifiedState.redirectUri ?? this.urlsConfig.frontendBaseUrl,
      };
    });
  }
}
