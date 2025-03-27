import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

import { type SeedFn } from "../../../lib/seeder/index.js";
import { findRepoRoot } from "../../../lib/utils/find-repo-root.js";

import { SeedUnitsChecker, type SeedUnit } from "./data/unit.schema.js";
import { SeedUsersChecker, type SeedUser } from "./data/user.schema.js";

export const seed: SeedFn = async (deps, logger) => {
  logger.info(
    { file: import.meta.url },
    "Seeding users and units from JSON files",
  );

  try {
    // Load the data files
    const dataDir = resolve(fileURLToPath(import.meta.url), "../data");

    // Load and validate users
    const usersPath = resolve(dataDir, "users.json");
    logger.info({ path: usersPath }, "Loading users data");
    const usersData = JSON.parse(readFileSync(usersPath, "utf8"));

    if (!SeedUsersChecker.Check(usersData)) {
      const errors = [...SeedUsersChecker.Errors(usersData)];
      logger.error({ errors }, "Invalid users data format");
      throw new Error("Invalid users data format");
    }

    // Load and validate units
    const unitsPath = resolve(dataDir, "units.json");
    logger.info({ path: unitsPath }, "Loading units data");
    const unitsData = JSON.parse(readFileSync(unitsPath, "utf8"));

    if (!SeedUnitsChecker.Check(unitsData)) {
      const errors = [...SeedUnitsChecker.Errors(unitsData)];
      logger.error({ errors }, "Invalid units data format");
      throw new Error("Invalid units data format");
    }

    // Load the Keycloak configuration for email addresses
    const repoRoot = findRepoRoot();
    const technovaJsonPath = resolve(
      repoRoot,
      "_dev-env/k8s/keycloak/config/technova.json",
    );

    logger.info(
      { path: technovaJsonPath },
      "Loading Keycloak realm configuration",
    );
    const technovaRealm = JSON.parse(readFileSync(technovaJsonPath, "utf8"));
    const keycloakUsers = technovaRealm.users || [];

    // Create a mapping of employeeId to email from Keycloak
    const emailMap = new Map<string, string>();
    for (const keycloakUser of keycloakUsers) {
      if (keycloakUser.email && keycloakUser.attributes?.employeeId?.[0]) {
        emailMap.set(keycloakUser.attributes.employeeId[0], keycloakUser.email);
      }
    }

    const users = usersData as SeedUser[];
    const units = unitsData as SeedUnit[];

    // We know these IDs from 0000000000010-addTenant.ts
    const tenantId = "00000000-0000-0000-0000-000000000000";
    const connectorId = "00000000-0000-0000-0000-000000000000";

    // Wrap all database operations in a transaction
    await deps.db.transaction(async (tx) => {
      logger.info("Starting transaction for users and units seeding");

      // Create a map to store the mapping between seed IDs and database IDs
      const userIdMap = new Map<string, string>();
      const unitIdMap = new Map<string, string>();

      // First, create all users
      for (const user of users) {
        logger.info({ userId: user.id }, "Creating user");

        // Get email from Keycloak mapping or throw error
        const email = emailMap.get(user.id);
        if (!email) {
          throw new Error(
            `No email found in Keycloak for employee ID: ${user.id}`,
          );
        }

        // Build IdP user info
        const idpUserInfo = {
          sub: user.id.toLowerCase(),
          name:
            user.name.override ||
            (user.name["name-order"] === "family-first"
              ? `${user.name.family} ${user.name.given}`
              : `${user.name.given} ${user.name.family}`),
          given_name: user.name.given,
          family_name: user.name.family,
          preferred_username: user.id.toLowerCase(),
          email: email,
          email_verified: true,
        };

        // Create the user
        const dbUser = await deps.users.createUser(
          {
            __type: "CreateUserInput",
            tenantId,
            connectorId,
            idpUserInfo,
            displayName:
              user.name.override ??
              (user.name["name-order"] === "family-first"
                ? `${user.name.family} ${user.name.given}`
                : `${user.name.given} ${user.name.family}`),
            externalIds: [{ kind: "employeeId", id: user.id }],
          },
          tx,
        );

        // Store the mapping
        userIdMap.set(user.id, dbUser.userId);

        const userTags = [
          ["title", user.title],
          ["level", user.level],
          ["department", user.department],
          ["subDepartment", user.sub_department],
          ["team", user.team],
          ["hireDate", user.hire_date],
        ] as const;

        for (const [key, value] of userTags) {
          if (value) {
            await deps.users.setUserTag(dbUser.userId, key, value, tx);
          }
        }
      }

      const sortedUnits = topologicalSortUnits(units);

      // Create units in topological order
      for (const unit of sortedUnits) {
        logger.info({ unitId: unit.id, name: unit.name }, "Creating unit");

        const parentUnitId = unit.parent_id
          ? unitIdMap.get(unit.parent_id)
          : null;

        // Create the unit using UnitService
        const dbUnit = await deps.units.createUnit(
          tenantId,
          {
            __type: "CreateUnitInput",
            name: unit.name,
            type:
              unit.kind === "Organizational" ? "organizational" : "individual",
            parentUnitId: parentUnitId || undefined,
          },
          { squelchEvents: true }, // Squelch events during seeding
          tx,
        );

        // Store the mapping
        unitIdMap.set(unit.id, dbUnit.id);

        // If it's an individual unit with an employee, create the assignment
        if (unit.kind === "Individual" && unit.employee_id) {
          const userId = userIdMap.get(unit.employee_id);
          if (userId) {
            // Assign user to unit using UnitService
            await deps.units.assignUserToUnit(
              tenantId,
              dbUnit.id,
              {
                __type: "UnitAssignmentInput",
                userId: userId,
              },
              { squelchEvents: true }, // Squelch events during seeding
              tx,
            );
          } else {
            logger.warn(
              { unitId: unit.id, employeeId: unit.employee_id },
              "Employee ID not found for unit assignment",
            );
          }
        }
      }

      logger.info("Transaction completed successfully");
    });

    logger.info("User and unit creation complete");
  } catch (error) {
    logger.error(
      { err: error },
      "Failed to seed users and units from JSON files",
    );
    throw error;
  }
};

function topologicalSortUnits(units: SeedUnit[]): SeedUnit[] {
  // Create adjacency list
  const graph: Record<string, string[]> = {};
  const result: SeedUnit[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  // Initialize graph
  for (const unit of units) {
    graph[unit.id] = [];
  }

  // Build edges (child -> parent)
  for (const unit of units) {
    if (unit.parent_id) {
      const g = graph[unit.id];
      if (!g) {
        throw new Error(`No graph found for unit ${unit.id}`);
      }

      g.push(unit.parent_id);
    }
  }

  // DFS function for topological sort
  function visit(unitId: string) {
    // Check for cycles
    if (temp.has(unitId)) {
      throw new Error(`Cycle detected in unit hierarchy at unit ${unitId}`);
    }

    // Skip if already visited
    if (visited.has(unitId)) {
      return;
    }

    // Mark as temporarily visited
    temp.add(unitId);

    // Visit all dependencies (parents)
    const visiting = graph[unitId];
    if (!visiting) {
      throw new Error(`No parents found for unit ${unitId}`);
    }

    for (const parentId of visiting) {
      visit(parentId);
    }

    // Mark as visited
    temp.delete(unitId);
    visited.add(unitId);

    // Add to result
    const unit = units.find((u) => u.id === unitId);
    if (unit) {
      result.push(unit);
    }
  }

  // Visit all nodes
  for (const unit of units) {
    if (!visited.has(unit.id)) {
      visit(unit.id);
    }
  }

  // Reverse to get correct order (parents before children)
  return result.reverse();
}
