import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Static } from "@sinclair/typebox";
import { and, eq } from "drizzle-orm";
import { type Logger } from "pino";

import {
  type DBAuthConnector,
  type DBAuthConnectorDomain,
} from "../../_db/models.js";
import {
  AUTH_CONNECTORS,
  AUTH_CONNECTOR_DOMAINS,
} from "../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../lib/ext/typebox/index.js";
import { type VaultService } from "../../lib/functional/vault/service.js";
import { type TenantId, TenantIds } from "../tenants/id.js";

import { type AuthConnectorId, AuthConnectorIds } from "./id.js";
import {
  type CreateAuthConnectorInput,
  type UpdateAuthConnectorInput,
  type OIDCConnectorState,
  type AuthConnectorPublic,
} from "./schemas/index.js";
import {
  type OidcConfiguration,
  OidcConfigurationChecker,
} from "./schemas/oidc-configuration.js";

export class AuthConnectorService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  static async fetchOpenIDConfiguration(
    logger: Logger,
    fetch: FetchFn,
    configurationUrl: string,
  ): Promise<OidcConfiguration> {
    logger = logger.child({
      fn: AuthConnectorService.fetchOpenIDConfiguration.name,
    });

    const response = await fetch(configurationUrl);
    if (!response.ok) {
      logger.error(
        { responseCode: response.status, responseText: response.statusText },
        "Failed to fetch OpenID configuration",
      );
      throw new Error(
        `Failed to fetch OpenID configuration: ${response.statusText}`,
      );
    }

    const ret = await response.json();

    if (!OidcConfigurationChecker.Check(ret)) {
      const oidcErrors = OidcConfigurationChecker.Errors(ret);
      logger.error(
        { oidcErrors: [...oidcErrors] },
        "Invalid OpenID configuration received from provider",
      );
      throw new Error("Invalid OpenID configuration received from provider");
    }

    return ret;
  }

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly vault: VaultService,
    private readonly fetch: FetchFn,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  async toPublic(connector: DBAuthConnector): Promise<AuthConnectorPublic>;
  async toPublic(
    authConnectorId: AuthConnectorId,
  ): Promise<AuthConnectorPublic>;
  async toPublic(
    input: DBAuthConnector | AuthConnectorId,
  ): Promise<AuthConnectorPublic> {
    const connector =
      typeof input === "string" ? await this.getById(input) : input;

    if (!connector) {
      throw new NotFoundError(`Auth connector not found: ${input}`);
    }

    // Verify connector belongs to this tenant
    if (connector.tenantId !== this.tenantUuid) {
      throw new NotFoundError(`Auth connector not found in tenant: ${input}`);
    }

    const domains = await this.getDomains(
      AuthConnectorIds.toRichId(connector.authConnectorId),
    );

    return {
      __type: "AuthConnectorPublic",
      authConnectorId: AuthConnectorIds.toRichId(connector.authConnectorId),
      tenantId: TenantIds.toRichId(connector.tenantId),
      name: connector.name,
      domains: domains.map((d) => d.domain),
    };
  }

  async getById(
    authConnectorId: AuthConnectorId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBAuthConnector | null> {
    const connector = await executor
      .select()
      .from(AUTH_CONNECTORS)
      .where(
        and(
          eq(
            AUTH_CONNECTORS.authConnectorId,
            AuthConnectorIds.toUUID(authConnectorId),
          ),
          eq(AUTH_CONNECTORS.tenantId, this.tenantUuid),
        ),
      )
      .limit(1);

    return connector[0] ?? null;
  }

  async getByTenantId(
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBAuthConnector[]> {
    return executor
      .select()
      .from(AUTH_CONNECTORS)
      .where(eq(AUTH_CONNECTORS.tenantId, this.tenantUuid));
  }

  async getByDomain(
    domain: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBAuthConnector[]> {
    return executor
      .select({
        connector: AUTH_CONNECTORS,
      })
      .from(AUTH_CONNECTOR_DOMAINS)
      .innerJoin(
        AUTH_CONNECTORS,
        eq(
          AUTH_CONNECTOR_DOMAINS.authConnectorId,
          AUTH_CONNECTORS.authConnectorId,
        ),
      )
      .where(
        and(
          eq(AUTH_CONNECTOR_DOMAINS.domain, domain),
          eq(AUTH_CONNECTORS.tenantId, this.tenantUuid),
        ),
      )
      .then((rows) => rows.map((r) => r.connector));
  }

  async withConnectorById<T>(
    authConnectorId: AuthConnectorId,
    fn: (connector: DBAuthConnector) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T | null> {
    const connector = await this.getById(authConnectorId, executor);
    if (!connector) {
      return null;
    }
    return fn(connector);
  }

  async getDomains(
    authConnectorId: AuthConnectorId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBAuthConnectorDomain[]> {
    // First verify the connector belongs to this tenant
    const connector = await this.getById(authConnectorId, executor);
    if (!connector) {
      throw new NotFoundError(`Auth connector not found: ${authConnectorId}`);
    }

    return executor
      .select()
      .from(AUTH_CONNECTOR_DOMAINS)
      .where(
        eq(
          AUTH_CONNECTOR_DOMAINS.authConnectorId,
          AuthConnectorIds.toUUID(authConnectorId),
        ),
      );
  }

  async addDomain(
    authConnectorId: AuthConnectorId,
    domain: string,
    executor: Drizzle = this.db,
  ): Promise<DBAuthConnectorDomain> {
    const logger = this.logger.child({ fn: this.addDomain.name });

    // First verify the connector belongs to this tenant
    const connector = await this.getById(authConnectorId, executor);
    if (!connector) {
      throw new NotFoundError(`Auth connector not found: ${authConnectorId}`);
    }

    const [domainRecord] = await executor
      .insert(AUTH_CONNECTOR_DOMAINS)
      .values({
        authConnectorId: AuthConnectorIds.toUUID(authConnectorId),
        domain,
      })
      .returning();

    if (!domainRecord) {
      throw new Error("Domain not added");
    }

    logger.info({ authConnectorId, domain }, "Added domain to auth connector");
    return domainRecord;
  }

  async deleteDomain(
    authConnectorId: AuthConnectorId,
    domain: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    const logger = this.logger.child({ fn: this.deleteDomain.name });

    // First verify the connector belongs to this tenant
    const connector = await this.getById(authConnectorId, executor);
    if (!connector) {
      throw new NotFoundError(`Auth connector not found: ${authConnectorId}`);
    }

    const result = await executor
      .delete(AUTH_CONNECTOR_DOMAINS)
      .where(
        and(
          eq(
            AUTH_CONNECTOR_DOMAINS.authConnectorId,
            AuthConnectorIds.toUUID(authConnectorId),
          ),
          eq(AUTH_CONNECTOR_DOMAINS.domain, domain),
        ),
      );

    if (!result) {
      throw new NotFoundError(
        `Domain ${domain} not found for connector: ${authConnectorId}`,
      );
    }

    logger.info(
      { authConnectorId, domain },
      "Deleted domain from auth connector",
    );
  }

  async TX_createConnector(
    input: CreateAuthConnectorInput,
  ): Promise<DBAuthConnector> {
    const logger = this.logger.child({ fn: this.TX_createConnector.name });

    // Ensure the tenant ID matches this service's tenant
    if (input.tenantId !== this.tenantId) {
      throw new BadRequestError(
        `Cannot create connector for different tenant: ${input.tenantId}`,
      );
    }

    const openidConfiguration =
      await AuthConnectorService.fetchOpenIDConfiguration(
        logger,
        this.fetch,
        input.settings.configurationUrl,
      );

    const state: OIDCConnectorState = {
      type: "openid",
      settings: input.settings,
      openidConfiguration,
    };

    return this.db.transaction(async (tx) => {
      const [connector] = await tx
        .insert(AUTH_CONNECTORS)
        .values({
          authConnectorId: input.authConnectorId
            ? AuthConnectorIds.toUUID(input.authConnectorId)
            : undefined,
          tenantId: this.tenantUuid,
          name: input.name,
          state: await this.vault.encrypt(state),
        })
        .returning();

      if (!connector) {
        throw new Error("Connector not created");
      }

      if (input.domains?.length > 0) {
        await tx.insert(AUTH_CONNECTOR_DOMAINS).values(
          input.domains.map((domain) => ({
            authConnectorId: connector.authConnectorId,
            domain,
          })),
        );
      }

      logger.info(
        { authConnectorId: connector.authConnectorId },
        "Created auth connector",
      );
      return connector;
    });
  }

  async TX_updateConnector(
    authConnectorId: AuthConnectorId,
    input: Static<typeof UpdateAuthConnectorInput>,
  ): Promise<DBAuthConnector> {
    const logger = this.logger.child({ fn: this.TX_updateConnector.name });

    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(AUTH_CONNECTORS)
        .where(
          and(
            eq(
              AUTH_CONNECTORS.authConnectorId,
              AuthConnectorIds.toUUID(authConnectorId),
            ),
            eq(AUTH_CONNECTORS.tenantId, this.tenantUuid),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        throw new NotFoundError(`Auth connector not found: ${authConnectorId}`);
      }

      const existingState = await this.vault.decrypt(existing[0].state);
      if (existingState.type !== "openid") {
        throw new BadRequestError("Cannot update non-OIDC connector");
      }

      const openidConfiguration =
        await AuthConnectorService.fetchOpenIDConfiguration(
          logger,
          this.fetch,
          input.settings.configurationUrl,
        );

      const newState: OIDCConnectorState = {
        type: "openid",
        settings: input.settings,
        openidConfiguration,
      };

      const [updated] = await tx
        .update(AUTH_CONNECTORS)
        .set({
          name: input.name,
          state: await this.vault.encrypt(newState),
        })
        .where(
          and(
            eq(
              AUTH_CONNECTORS.authConnectorId,
              AuthConnectorIds.toUUID(authConnectorId),
            ),
            eq(AUTH_CONNECTORS.tenantId, this.tenantUuid),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Connector not updated");
      }

      logger.info({ authConnectorId }, "Updated auth connector");
      return updated;
    });
  }

  async TX_deleteConnector(authConnectorId: AuthConnectorId): Promise<void> {
    const logger = this.logger.child({ fn: this.TX_deleteConnector.name });

    // First verify the connector belongs to this tenant
    const connector = await this.getById(authConnectorId);
    if (!connector) {
      throw new NotFoundError(`Auth connector not found: ${authConnectorId}`);
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(AUTH_CONNECTOR_DOMAINS)
        .where(
          eq(
            AUTH_CONNECTOR_DOMAINS.authConnectorId,
            AuthConnectorIds.toUUID(authConnectorId),
          ),
        );

      const result = await tx
        .delete(AUTH_CONNECTORS)
        .where(
          and(
            eq(
              AUTH_CONNECTORS.authConnectorId,
              AuthConnectorIds.toUUID(authConnectorId),
            ),
            eq(AUTH_CONNECTORS.tenantId, this.tenantUuid),
          ),
        );

      if (!result) {
        throw new NotFoundError(`Auth connector not found: ${authConnectorId}`);
      }

      logger.info({ authConnectorId }, "Deleted auth connector");
    });
  }
}
