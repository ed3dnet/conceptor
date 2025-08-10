#!/usr/bin/env tsx

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Development Environment Setup Script
 * This script prepares a fresh development environment for the project
 */

import { execSync, spawn } from "child_process";
import * as crypto from "crypto";
import { promises as fs, existsSync } from "fs";
import * as path from "path";

import pino from "pino";
import which from "which";

// Initialize logger with pretty transport
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
      messageFormat: "[{level}] {msg}",
      customColors: "info:blue,warn:yellow,error:red",
    },
  },
  level: "info",
});

/**
 * Check if a command exists in the system PATH
 */
async function checkCommand(command: string): Promise<boolean> {
  try {
    await which(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a command and return stdout, with proper error handling
 */
async function execCommand(
  command: string,
  options: { cwd?: string } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", ["-c", command], {
      cwd: options.cwd || process.cwd(),
      stdio: "pipe",
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `Command failed with exit code ${code}: ${stderr || stdout}`,
          ),
        );
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Check if a value is a secret placeholder
 */
function isSecretPlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return (
    value === "!!SECRET!!" ||
    (value.startsWith("YOUR_") && value.endsWith("_HERE"))
  );
}

/**
 * Check if a field name indicates it contains secret data
 */
function isSecretField(fieldName: string): boolean {
  const secretPatterns = [
    "key",
    "token",
    "password",
    "secret",
    "auth",
    "credential",
  ];
  const lowerField = fieldName.toLowerCase();
  return secretPatterns.some((pattern) => lowerField.includes(pattern));
}

/**
 * Recursively merge MCP configurations, preserving secrets from existing config
 */
function mergeMcpConfig(
  sample: any,
  existing: any,
  projectRoot: string,
  basicMemoryProjectName?: string,
): any {
  const merged = JSON.parse(JSON.stringify(sample));

  // Replace path placeholders and project name placeholders
  const replacePathsRecursively = (obj: any): any => {
    if (typeof obj === "string") {
      let result = obj.replace(
        /\/absolute\/path\/to\/your\/project\/root/g,
        projectRoot,
      );
      if (basicMemoryProjectName) {
        result = result.replace(
          /conceptor-UPDATE_ME_WITH_HASH/g,
          basicMemoryProjectName,
        );
      }
      return result;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = replacePathsRecursively(obj[i]);
      }
      return obj;
    }

    if (typeof obj === "object" && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = replacePathsRecursively(value);
      }
    }

    return obj;
  };

  if (!existing?.mcpServers) {
    replacePathsRecursively(merged);
    return merged;
  }

  // Check for removed servers
  const sampleServers = new Set(Object.keys(sample.mcpServers || {}));
  const existingServers = new Set(Object.keys(existing.mcpServers || {}));
  const removedServers = Array.from(existingServers).filter(
    (server) => !sampleServers.has(server),
  );

  if (removedServers.length > 0) {
    throw new Error(
      `MCP server configuration error: The following servers were removed from .mcp.sample.json but exist in your current .mcp.json:\n` +
        removedServers.map((server) => `  - ${server}`).join("\n") +
        "\n" +
        "Please update .mcp.sample.json to include these servers or remove them from your .mcp.json manually.",
    );
  }

  // Merge each server configuration
  for (const [serverName, sampleConfig] of Object.entries(
    sample.mcpServers || {},
  )) {
    const existingConfig = existing.mcpServers?.[serverName];

    if (existingConfig) {
      // Merge configurations, preserving secrets from existing config
      merged.mcpServers[serverName] = mergeServerConfig(
        sampleConfig,
        existingConfig,
      );
    }
  }

  // Apply replacements AFTER merging to ensure they take effect
  replacePathsRecursively(merged);

  return merged;
}

/**
 * Merge individual server configurations, preserving secrets
 */
function mergeServerConfig(sample: any, existing: any): any {
  const merged = JSON.parse(JSON.stringify(sample));

  const mergeObject = (
    sampleObj: any,
    existingObj: any,
    targetObj: any,
  ): void => {
    for (const [key, sampleValue] of Object.entries(sampleObj)) {
      const existingValue = existingObj?.[key];

      if (
        typeof sampleValue === "object" &&
        sampleValue !== null &&
        !Array.isArray(sampleValue)
      ) {
        // Recursively merge nested objects
        if (
          typeof existingValue === "object" &&
          existingValue !== null &&
          !Array.isArray(existingValue)
        ) {
          targetObj[key] = JSON.parse(JSON.stringify(sampleValue));
          mergeObject(sampleValue, existingValue, targetObj[key]);
        }
      } else if (
        isSecretField(key) &&
        isSecretPlaceholder(sampleValue) &&
        existingValue !== undefined
      ) {
        // Preserve existing secret values if sample has placeholder
        targetObj[key] = existingValue;
      }
      // Otherwise keep the sample value (already copied in merged)
    }
  };

  mergeObject(sample, existing, merged);
  return merged;
}

/**
 * Generate a truncated hash of the project root path for use in project names
 */
function generateProjectHash(projectRoot: string): string {
  return crypto
    .createHash("sha256")
    .update(projectRoot)
    .digest("hex")
    .substring(0, 8);
}

/**
 * Setup basic-memory project for the current directory
 */
async function setupBasicMemoryProject(projectRoot: string): Promise<string> {
  const hash = generateProjectHash(projectRoot);
  const projectName = `conceptor-${hash}`;
  const memoryBankPath = path.join(projectRoot, ".memory-bank");

  try {
    // Check if project already exists
    logger.info("Checking existing basic-memory projects...");
    const projectListOutput = await execCommand(
      "poetry run -- basic-memory project list",
    );

    // Simple check if project name exists in output
    if (projectListOutput.includes(projectName)) {
      logger.info(`✓ Basic-memory project '${projectName}' already exists`);
      return projectName;
    }

    // Create .memory-bank directory if it doesn't exist
    await fs.mkdir(memoryBankPath, { recursive: true });

    // Create the project
    logger.info(
      `Creating basic-memory project '${projectName}' at ${memoryBankPath}...`,
    );
    await execCommand(
      `poetry run -- basic-memory project add "${projectName}" "${memoryBankPath}" --default`,
    );
    logger.info(`✓ Created basic-memory project '${projectName}'`);

    return projectName;
  } catch (error) {
    logger.warn(`Failed to setup basic-memory project: ${error}`);
    logger.warn("Falling back to default project name placeholder");
    return "conceptor-UPDATE_ME_WITH_HASH";
  }
}

/**
 * Find project root by looking for package.json with pnpm workspace config
 */
async function findProjectRoot(): Promise<string> {
  let dir = process.cwd();

  while (dir !== "/") {
    const packageJsonPath = path.join(dir, "package.json");

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, "utf-8"),
        );
        if (packageJson.pnpm?.workspaces || packageJson.workspaces) {
          return dir;
        }
      } catch {
        // Continue searching if package.json is malformed
      }
    }

    dir = path.dirname(dir);
  }

  return process.cwd();
}

/**
 * Main setup function
 */
async function main(): Promise<void> {
  try {
    logger.info("Starting development environment setup...");

    // 1. CD to project root directory
    const projectRoot = await findProjectRoot();
    logger.info(`Using project root: ${projectRoot}`);
    process.chdir(projectRoot);

    // 2. Check if asdf is installed
    if (!(await checkCommand("asdf"))) {
      logger.error("asdf is not installed. Please install asdf first:");
      logger.error("  macOS: brew install asdf");
      logger.error(
        "  Linux: git clone https://github.com/asdf-vm/asdf.git ~/.asdf",
      );
      logger.error("Then restart your shell and run this script again.");
      process.exit(1);
    }

    // 3. Add asdf plugins from .tool-versions if missing
    if (existsSync(".tool-versions")) {
      logger.info("Installing asdf plugins from .tool-versions...");
      const toolVersions = await fs.readFile(".tool-versions", "utf-8");

      for (const line of toolVersions.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const [plugin] = trimmed.split(" ");
        if (!plugin) continue;

        try {
          const existingPlugins = await execCommand("asdf plugin list");
          if (!existingPlugins.split("\n").includes(plugin)) {
            logger.info(`Adding asdf plugin: ${plugin}`);
            try {
              await execCommand(`asdf plugin add ${plugin}`);
              logger.info(`✓ Added plugin: ${plugin}`);
            } catch {
              logger.warn(
                `Failed to add plugin: ${plugin} (may already exist or be unavailable)`,
              );
            }
          } else {
            logger.info(`Plugin already exists: ${plugin}`);
          }
        } catch (error) {
          logger.warn(`Error checking plugins: ${error}`);
        }
      }
    } else {
      logger.warn(
        ".tool-versions not found, skipping asdf plugin installation",
      );
    }

    // 4. Run asdf install
    if (existsSync(".tool-versions")) {
      logger.info("Installing tools from .tool-versions...");
      try {
        await execCommand("asdf install");
        logger.info("✓ asdf install completed");
      } catch (error) {
        logger.error("asdf install failed");
        logger.error(String(error));
        process.exit(1);
      }
    }

    // 5. Install poetry if not available
    if (!(await checkCommand("poetry"))) {
      logger.info("Installing poetry...");
      if (await checkCommand("pip")) {
        await execCommand("pip install poetry");
        logger.info("✓ Poetry installed via pip");
      } else if (await checkCommand("pip3")) {
        await execCommand("pip3 install poetry");
        logger.info("✓ Poetry installed via pip3");
      } else {
        logger.error(
          "Neither pip nor pip3 found. Please install Python and pip first.",
        );
        process.exit(1);
      }
    } else {
      logger.info("Poetry already installed");
    }

    // 6. Run poetry install
    if (existsSync("pyproject.toml")) {
      logger.info("Running poetry install...");
      try {
        await execCommand("poetry install --no-root");
        logger.info("✓ Poetry install completed");
      } catch (error) {
        logger.error("Poetry install failed");
        logger.error(String(error));
        process.exit(1);
      }
    } else {
      logger.warn("pyproject.toml not found, skipping poetry install");
    }

    // 7. Setup basic-memory project
    logger.info("Setting up basic-memory project...");
    const basicMemoryProjectName = await setupBasicMemoryProject(projectRoot);

    // 8. Enable pnpm via corepack (preferred) or install globally
    if (!(await checkCommand("pnpm"))) {
      logger.info("Setting up pnpm...");
      if (await checkCommand("corepack")) {
        logger.info("Enabling pnpm via corepack (recommended)");
        await execCommand("corepack enable");

        if (existsSync("package.json")) {
          const packageJson = JSON.parse(
            await fs.readFile("package.json", "utf-8"),
          );
          if (packageJson.packageManager) {
            // Use the version specified in package.json
            await execCommand("corepack install");
            logger.info(
              "✓ pnpm enabled via corepack using package.json version",
            );
          } else {
            // Use latest version
            await execCommand("corepack prepare pnpm@latest --activate");
            logger.info("✓ pnpm enabled via corepack (latest)");
          }
        } else {
          await execCommand("corepack prepare pnpm@latest --activate");
          logger.info("✓ pnpm enabled via corepack (latest)");
        }
      } else if (await checkCommand("npm")) {
        logger.warn(
          "Corepack not available, falling back to global npm install",
        );
        await execCommand("npm install -g pnpm");
        logger.info("✓ pnpm installed globally via npm");
      } else {
        logger.error(
          "Neither corepack nor npm found. Please install Node.js 16+ first.",
        );
        process.exit(1);
      }
    } else {
      logger.info("pnpm already available");
    }

    // 9. Run husky
    if (existsSync("package.json")) {
      const packageJson = JSON.parse(
        await fs.readFile("package.json", "utf-8"),
      );
      if (
        packageJson.devDependencies?.husky ||
        packageJson.dependencies?.husky
      ) {
        logger.info("Setting up husky...");
        try {
          await execCommand("pnpm husky");
          logger.info("✓ Husky setup completed");
        } catch {
          logger.warn("Husky setup failed, but continuing...");
        }
      } else {
        logger.warn("Husky not found in package.json, skipping");
      }
    } else {
      logger.warn("package.json not found, skipping husky setup");
    }

    // 10. Intelligently merge .mcp.sample.json with existing .mcp.json, preserving secrets
    if (!existsSync(".mcp.sample.json")) {
      logger.error(".mcp.sample.json is required but not found");
      logger.error("Please create .mcp.sample.json in the project root");
      process.exit(1);
    }

    logger.info("Setting up .mcp.json...");

    // Read sample configuration
    const mcpSampleContent = await fs.readFile(".mcp.sample.json", "utf-8");
    const mcpSample = JSON.parse(mcpSampleContent);

    // Read existing configuration if it exists
    let existingMcp = null;
    if (existsSync(".mcp.json")) {
      try {
        const existingContent = await fs.readFile(".mcp.json", "utf-8");
        existingMcp = JSON.parse(existingContent);
        logger.info("Found existing .mcp.json, merging configurations...");
      } catch (error) {
        logger.error("Existing .mcp.json is malformed and cannot be parsed");
        logger.error(
          "Please fix the JSON syntax in .mcp.json or delete it to regenerate",
        );
        process.exit(1);
      }
    }

    // Merge configurations intelligently
    const mergedConfig = mergeMcpConfig(
      mcpSample,
      existingMcp,
      projectRoot,
      basicMemoryProjectName,
    );

    // Write merged configuration
    await fs.writeFile(".mcp.json", JSON.stringify(mergedConfig, null, 2));

    if (existingMcp) {
      logger.info(
        "✓ Merged .mcp.json with existing configuration, secrets preserved",
      );
    } else {
      logger.info(`✓ Created .mcp.json with project root: ${projectRoot}`);
    }

    logger.info("Setting up Cursor MCP configuration...");
    await fs.mkdir(".cursor", { recursive: true });
    await fs.copyFile(".mcp.json", ".cursor/mcp.json");
    logger.info("✓ Copied .mcp.json to .cursor/mcp.json");

    // 11. Copy .env.development.sample to .env.development with key comparison
    if (existsSync(".env.development.sample")) {
      logger.info("Setting up .env.development...");
      if (!existsSync(".env.development")) {
        await fs.copyFile(".env.development.sample", ".env.development");
        logger.info("✓ Created .env.development from sample");
        logger.warn(
          "Please review and update .env.development with your specific values",
        );
      } else {
        logger.info(
          ".env.development already exists, checking for missing keys...",
        );

        // Extract exported variable names from both files
        const sampleContent = await fs.readFile(
          ".env.development.sample",
          "utf-8",
        );
        const existingContent = await fs
          .readFile(".env.development", "utf-8")
          .catch(() => "");

        const sampleKeys = new Set(
          sampleContent
            .split("\n")
            .filter((line) => line.match(/^export [A-Z_]+=/))
            .map((line) => line.split("=")[0].replace("export ", ""))
            .filter(Boolean),
        );

        const existingKeys = new Set(
          existingContent
            .split("\n")
            .filter((line) => line.match(/^export [A-Z_]+=/))
            .map((line) => line.split("=")[0].replace("export ", ""))
            .filter(Boolean),
        );

        const missingKeys = Array.from(sampleKeys).filter(
          (key) => !existingKeys.has(key),
        );

        if (missingKeys.length > 0) {
          logger.warn(
            "The following keys from .env.development.sample are missing in .env.development:",
          );
          missingKeys.forEach((key) => logger.warn(`  - ${key}`));
          logger.info(
            "Consider adding these keys to your .env.development file",
          );
        } else {
          logger.info(
            "✓ All sample environment keys are present in .env.development",
          );
        }
      }
    } else {
      logger.warn(
        ".env.development.sample not found, skipping environment setup",
      );
    }

    // 12. Sync basic-memory to ensure everything is up to date
    logger.info("Syncing basic-memory...");
    try {
      await execCommand("pnpm memory:sync", { cwd: projectRoot });
      logger.info("✓ Basic-memory sync completed");
    } catch (error) {
      logger.warn(`Basic-memory sync failed: ${error}`);
      logger.warn("You can run 'pnpm memory:sync' manually later");
    }

    logger.info("✓ Development environment setup completed!");
    logger.info("Next steps:");
    logger.info(
      "  1. Review and update .env.development with your API keys and settings",
    );
    logger.info("  2. Run 'pnpm run svc:up' to start development services");
  } catch (error) {
    logger.error("Setup failed:");
    logger.error(String(error));
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  logger.error("Unexpected error:");
  logger.error(String(error));
  process.exit(1);
});
