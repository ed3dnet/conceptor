import { type SeedFn } from "../../../lib/seeder/index.js";

export const seed: SeedFn = async (deps, logger) => {
  logger.info({ file: import.meta.url }, "Seeding.");

  const keycloakUrl = process.env.KEYCLOAK_URL;
  if (!keycloakUrl) {
    throw new Error("KEYCLOAK_URL is not set");
  }

  const tenant = await deps.tenants.TX_createTenant({
    tenantId: "00000000-0000-0000-0000-000000000000",
    slug: "demotenant",
    displayName: "My Demo Company",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const connector = await deps.authConnectors.TX_createConnector({
    tenantId: tenant.tenantId,
    name: "Keycloak OIDC",
    domains: ["example.net"],
    settings: {
      configurationUrl: `${keycloakUrl}/realms/democo/.well-known/openid-configuration`,
      clientId: "conceptor-oidc",
      clientSecret: "oidc-client-secret",
      scopes: ["openid", "email", "profile"],
    },
  });
};
