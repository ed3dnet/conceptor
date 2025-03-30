import { AuthConnectorIds } from "../../../domain/auth-connectors/id.js";
import { TenantIds } from "../../../domain/tenants/id.js";
import { type SeedFn } from "../../../lib/seeder/index.js";

export const seed: SeedFn = async (deps, logger) => {
  logger.info({ file: import.meta.url }, "Seeding.");

  const keycloakUrl = process.env.KEYCLOAK_URL;
  if (!keycloakUrl) {
    throw new Error("KEYCLOAK_URL is not set");
  }

  const tenant = await deps.tenants.TX_createTenant({
    tenantId: TenantIds.toRichId("00000000-0000-0000-0000-000000000000"),
    slug: "technova",
    displayName: "TechNova Global",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const tenantDeps = (await deps.tenantDomainBuilder(tenant.tenantId)).cradle;

  const connector = await tenantDeps.authConnectors.TX_createConnector({
    authConnectorId: AuthConnectorIds.toRichId(
      "00000000-0000-0000-0000-000000000000",
    ),
    tenantId: tenant.tenantId,
    name: "Keycloak OIDC",
    domains: ["example.net"],
    settings: {
      configurationUrl: `${keycloakUrl}/realms/technova/.well-known/openid-configuration`,
      clientId: "conceptor-oidc",
      clientSecret: "oidc-client-secret",
      scopes: ["openid", "email", "profile"],
    },
  });
};
