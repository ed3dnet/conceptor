/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import inquirer from "inquirer";
import { dump as dumpYaml, load as loadYaml } from "js-yaml";

interface TunnelConfig {
  tunnel: string;
  credentials_file: string;
  ingress: Array<
    | {
        hostname: string;
        service: string;
      }
    | {
        service: string;
      }
  >;
}

interface DomainConfig {
  baseDomain: string;
  prefix: string;
}

const startDir = import.meta.dirname;
const devEnvRootDir = path.resolve(startDir, "..");
const repoRootDir = path.resolve(devEnvRootDir, "..");

const TUNNEL_CONFIG_PATH = path.join(devEnvRootDir, "cloudflared/config.yaml");
const TUNNEL_CRED_PATH = path.join(
  devEnvRootDir,
  "cloudflared/tunnel-credentials.json",
);
const DOMAINS_CONFIG_PATH = path.join(
  devEnvRootDir,
  "cloudflared/domains.json",
);
const ENV_PATH = path.join(repoRootDir, ".env.development");

if (!existsSync(ENV_PATH)) {
  console.error(
    ".env.development not found. Please copy .env.development.sample first.",
  );
  process.exit(1);
}

function getTunnelName(): string {
  const pwd = process.cwd();
  const hash = createHash("sha256").update(pwd).digest("hex").slice(0, 4);
  return `identivine-dev-${hash}`;
}

function checkCloudflared() {
  try {
    execSync("cloudflared --version");
  } catch (e) {
    console.error("cloudflared not found. Please install it first.");
    console.error(
      "See: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation",
    );
    process.exit(1);
  }
}

function ensureCloudflareLogin() {
  try {
    execSync("cloudflared tunnel list", { stdio: "pipe" });
  } catch (e) {
    console.log("Please log in to Cloudflare:");
    execSync("cloudflared login", { stdio: "inherit" });
  }
}

function createTunnelIfNeeded(
  tunnelName: string,
  domains: DomainConfig,
): string {
  try {
    const output = execSync(`cloudflared tunnel list --output json`, {
      encoding: "utf8",
    });
    const tunnels = JSON.parse(output) ?? [];
    const existing = tunnels.find((t: any) => t.name === tunnelName);

    if (existing) {
      console.log(`Using existing tunnel: ${tunnelName}`);
      return existing.id;
    }

    console.log(`Creating new tunnel: ${tunnelName}`);
    const createOutput = execSync(`cloudflared tunnel create ${tunnelName}`, {
      encoding: "utf8",
    });
    const tunnelId = createOutput.match(
      /Created tunnel .+ with id ([\w-]+)/,
    )?.[1];
    if (!tunnelId) throw new Error("Failed to extract tunnel ID");

    // Copy credentials file to our project directory
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const sourceCredPath = path.join(
      homeDir!,
      ".cloudflared",
      `${tunnelId}.json`,
    );
    const targetCredPath = TUNNEL_CRED_PATH;

    execSync(`mkdir -p ${path.dirname(targetCredPath)}`);
    execSync(`cp "${sourceCredPath}" "${targetCredPath}"`);

    // Set up DNS routes for each hostname
    const domainEntries = JSON.parse(
      readFileSync(DOMAINS_CONFIG_PATH, "utf8"),
    ) as Record<string, DomainEntry>;

    for (const entry of Object.values(domainEntries)) {
      console.log(`Setting up DNS route for ${entry.subdomain}`);
      execSync(
        `cloudflared tunnel route dns '${tunnelName}' '${domains.prefix}-${entry.subdomain}.${domains.baseDomain}'`,
        {
          stdio: "inherit",
        },
      );
    }

    return tunnelId;
  } catch (e) {
    console.error("Failed to manage tunnel:", e);
    process.exit(1);
  }
}
async function getDomainConfig(): Promise<DomainConfig> {
  const defaultPrefix = execSync("whoami", { encoding: "utf8" }).trim();
  let existingDomain: string | undefined;
  let existingPrefix: string | undefined;

  if (existsSync(TUNNEL_CONFIG_PATH)) {
    const config = loadYaml(
      readFileSync(TUNNEL_CONFIG_PATH, "utf8"),
    ) as TunnelConfig;
    const firstIngress = config.ingress.find((i) => "hostname" in i) as
      | { hostname: string }
      | undefined;
    if (firstIngress) {
      const hostname = firstIngress.hostname;
      const parts = hostname.split(".");
      existingDomain = parts.slice(-2).join(".");
      // Get everything before the last dash
      const lastDashIndex = parts[0].lastIndexOf("-");
      existingPrefix = parts[0].slice(0, lastDashIndex);
    }
  }

  const response = await inquirer.prompt([
    {
      type: "input",
      name: "baseDomain",
      message: "What is your base domain?",
      default: existingDomain || "identivine.dev",
    },
    {
      type: "input",
      name: "prefix",
      message: "What prefix would you like for your subdomains?",
      default: existingPrefix || defaultPrefix,
    },
  ]);

  return response as DomainConfig;
}

interface DomainEntry {
  subdomain: string;
  service: string;
}

function generateTunnelConfig(
  tunnelName: string,
  domains: DomainConfig,
): TunnelConfig {
  const domainEntries = JSON.parse(
    readFileSync(DOMAINS_CONFIG_PATH, "utf8"),
  ) as Record<string, DomainEntry>;

  return {
    tunnel: tunnelName,
    credentials_file: TUNNEL_CRED_PATH,
    ingress: [
      ...Object.values(domainEntries).map((entry) => ({
        hostname: `${domains.prefix}-${entry.subdomain}.${domains.baseDomain}`,
        service: entry.service,
      })),
      { service: "http_status:404" },
    ],
  };
}

function setupDnsRoutes(tunnelName: string, domains: DomainConfig) {
  const domainEntries = JSON.parse(
    readFileSync(DOMAINS_CONFIG_PATH, "utf8"),
  ) as Record<string, DomainEntry>;

  for (const entry of Object.values(domainEntries)) {
    console.log(`Setting up DNS route for ${entry.subdomain}`);
    execSync(
      `cloudflared tunnel route dns '${tunnelName}' '${domains.prefix}-${entry.subdomain}.${domains.baseDomain}'`,
      {
        stdio: "inherit",
      },
    );
  }
}

async function updateEnvFile(domains: DomainConfig) {
  const envContent = readFileSync(ENV_PATH, "utf8");

  const updates: Record<string, string> = {
    S3_BASE_URL: `https://${domains.prefix}-s3.${domains.baseDomain}`,
    PANEL_BASE_URL: `https://${domains.prefix}-panel.${domains.baseDomain}`,
    PANEL_API_BASE_URL: `https://${domains.prefix}-api.${domains.baseDomain}`,
    CENTRAL_ATPROTO_LABELER__DOMAIN: `${domains.prefix}-labeler.${domains.baseDomain}`,
  };

  // Filter to only changed values
  const changedUpdates: Record<string, string> = {};
  for (const [key, newValue] of Object.entries(updates)) {
    const currentValue = envContent.match(
      new RegExp(`^export ${key}="?([^"\n]+)"?`, "m"),
    )?.[1];
    if (currentValue !== newValue) {
      changedUpdates[key] = newValue;
    }
  }

  if (Object.keys(changedUpdates).length === 0) {
    console.log("\nNo environment updates needed.");
    return;
  }

  console.log("\nEnvironment updates to be made:");
  for (const [key, newValue] of Object.entries(changedUpdates).sort()) {
    const currentValue = envContent.match(
      new RegExp(`^export ${key}="?([^"\n]+)"?`, "m"),
    )?.[1];
    console.log(`\n${key}:`);
    console.log(`  From: ${currentValue}`);
    console.log(`    To: ${newValue}`);
  }

  const response = await inquirer.prompt([
    {
      type: "confirm",
      name: "proceed",
      message: "Would you like to update these environment variables?",
      default: true,
    },
  ]);

  if (!response.proceed) {
    console.log("Skipping environment updates.");
    return;
  }

  let newContent = envContent;
  for (const [key, value] of Object.entries(changedUpdates)) {
    newContent = newContent.replace(
      new RegExp(`^export ${key}=.*$`, "m"),
      `export ${key}="${value}"`,
    );
  }

  writeFileSync(ENV_PATH, newContent);
  console.log("Environment variables updated successfully.");
}

async function main() {
  console.log("Initializing Cloudflare Tunnel setup...");

  checkCloudflared();
  ensureCloudflareLogin();

  const domains = await getDomainConfig();
  const tunnelName = getTunnelName();
  const tunnelId = createTunnelIfNeeded(tunnelName, domains);
  setupDnsRoutes(tunnelName, domains);

  const config = generateTunnelConfig(tunnelName, domains);
  writeFileSync(TUNNEL_CONFIG_PATH, dumpYaml(config));

  await updateEnvFile(domains);

  console.log("✅ Tunnel setup complete!");
  console.log(`Tunnel Name: ${tunnelName}`);
  console.log(`Tunnel ID: ${tunnelId}`);
  console.log("\nNext steps:");
  console.log(`1. Review the generated config at: ${TUNNEL_CONFIG_PATH}`);
  console.log("2. Review the updated .env.development file");
  console.log(
    `3. Start the tunnel with: cloudflared tunnel --config '${TUNNEL_CONFIG_PATH}' run '${tunnelName}'`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
