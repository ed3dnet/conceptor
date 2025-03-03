import { readFileSync } from "fs";
import { resolve } from "path";

import { type SeedFn } from "../../../lib/seeder/index.js";

export const seed: SeedFn = async (deps, logger) => {
  logger.info({ file: import.meta.url }, "Seeding users from Keycloak config.");

  // Load the technova.json file
  const repoRoot = resolve(process.cwd(), "../.."); // Assuming we're running from apps/central
  const technovaJsonPath = resolve(
    repoRoot,
    "_dev-env/k8s/keycloak/config/technova.json",
  );

  logger.info(
    { path: technovaJsonPath },
    "Loading Keycloak realm configuration",
  );

  try {
    const technovaRealm = JSON.parse(readFileSync(technovaJsonPath, "utf8"));
    const users = technovaRealm.users || [];

    logger.info({ count: users.length }, "Found users in Keycloak config");

    // We know these IDs from 0000000000010-addTenant.ts
    const tenantId = "00000000-0000-0000-0000-000000000000";
    const connectorId = "00000000-0000-0000-0000-000000000000";

    // Create users
    for (const keycloakUser of users) {
      logger.info({ username: keycloakUser.username }, "Creating user");

      // Build IdP user info from Keycloak user
      const idpUserInfo = {
        sub: keycloakUser.username,
        name: `${keycloakUser.firstName} ${keycloakUser.lastName}`,
        given_name: keycloakUser.firstName,
        family_name: keycloakUser.lastName,
        preferred_username: keycloakUser.username,
        email: keycloakUser.email,
        email_verified: keycloakUser.emailVerified || false,
      };

      // Build external IDs
      const externalIds = [];

      // Add employeeId as an externalId if it exists
      if (
        keycloakUser.attributes &&
        keycloakUser.attributes.employeeId &&
        keycloakUser.attributes.employeeId[0]
      ) {
        externalIds.push({
          type: "employeeId",
          id: keycloakUser.attributes.employeeId[0],
        });
      }

      // Create the user
      await deps.users.createUser({
        __type: "CreateUserInput",
        tenantId,
        connectorId,
        idpUserInfo,
        displayName: `${keycloakUser.firstName} ${keycloakUser.lastName}`,
        externalIds,
      });
    }

    logger.info("User creation complete");
  } catch (error) {
    logger.error({ error }, "Failed to seed users from Keycloak config");
    throw error;
  }
};
