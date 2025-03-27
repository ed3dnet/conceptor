/* eslint-disable no-restricted-globals */
/* eslint-disable no-prototype-builtins */
import { createHash } from "crypto";
import { readFileSync } from "fs";

// Process command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node script.js pathToUsersJson pathToUnitsJson");
  process.exit(1);
}

const pathToUsersJson = args[0];
const pathToUnitsJson = args[1];

// Generate a stable 4-digit number from a string
function generateStableNumber(str) {
  const hash = createHash("md5").update(str).digest("hex");
  const numericValue = parseInt(hash.substring(0, 8), 16);
  return ((numericValue % 9000) + 1000).toString(); // 4-digit number between 1000-9999
}

// Format name for email
function formatNameForEmail(name) {
  return name.toLowerCase().replace(/\s+/g, ".");
}

// Get level description from level code
function getLevelDescription(levelCode) {
  const levelMap = {
    L10: "CEO",
    L9: "C-Suite",
    L8: "SVP",
    L7: "VP",
    L6: "Director",
    L5: "Manager",
    L4: "Senior",
    L3: "Mid",
    L2: "Junior",
  };
  return levelMap[levelCode] || levelCode;
}

// Main function
function generateKeycloakRealm() {
  try {
    // Read input files
    const users = JSON.parse(readFileSync(pathToUsersJson, "utf8"));
    const units = JSON.parse(readFileSync(pathToUnitsJson, "utf8"));

    // Create realm object
    const realm = {
      realm: "technova",
      enabled: true,
      displayName: "TechNova Global",
      users: [],
      clients: [
        {
          clientId: "conceptor-oidc",
          enabled: true,
          protocol: "openid-connect",
          publicClient: false,
          redirectUris: ["*"],
          secret: "oidc-client-secret",
          standardFlowEnabled: true,
        },
      ],
    };

    // Process users
    users.forEach((user) => {
      // Extract name components
      let firstName, lastName;
      if (
        user.name.hasOwnProperty("given") &&
        user.name.hasOwnProperty("family")
      ) {
        firstName = user.name.given;
        lastName = user.name.family;
      } else if (
        user.name.hasOwnProperty("first") &&
        user.name.hasOwnProperty("last")
      ) {
        firstName = user.name.first;
        lastName = user.name.last;
      } else {
        firstName = "Unknown";
        lastName = "User";
      }

      const fullName = `${firstName} ${lastName}`;
      const emailNumber = generateStableNumber(`${fullName}${user.id}`);
      const email = `${formatNameForEmail(fullName)}.${emailNumber}@example.net`;

      // Find manager info
      let managerId = null;
      if (user.relationships) {
        const managerRel = user.relationships.find(
          (rel) => rel.kind === "manager",
        );
        if (managerRel) {
          managerId = managerRel.target;
        }
      }

      // Create Keycloak user object
      const keycloakUser = {
        username: user.id.toLowerCase(),
        enabled: user.enabled,
        firstName: firstName,
        lastName: lastName,
        email: email,
        emailVerified: true,
        attributes: {
          employeeId: [user.id],
          department: [user.department || ""],
          title: [user.title || ""],
          level: [getLevelDescription(user.level) || ""],
          subDepartment: user.sub_department ? [user.sub_department] : [],
          hireDate: [user.hire_date || ""],
        },
        credentials: [
          {
            type: "password",
            value: "password",
            temporary: false,
          },
        ],
      };

      // Add team if exists
      if (user.team) {
        keycloakUser.attributes.team = [user.team];
      }

      // Add manager ID if exists
      if (managerId) {
        keycloakUser.attributes.managerId = [managerId];
      }

      // Add the user to the realm
      realm.users.push(keycloakUser);
    });

    // Output the result
    console.log(JSON.stringify(realm, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run the main function
generateKeycloakRealm();
