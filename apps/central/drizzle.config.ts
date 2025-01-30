import { defineConfig, type Config } from "drizzle-kit";

import {
  getNodeEnv,
  getNum,
  requireBool,
  requireStr,
} from "./src/_config/env-prefix.ts";

const envVars = {
  host: requireStr("POSTGRES__READWRITE__HOST"),
  port: getNum("POSTGRES__READWRITE__PORT", 5432),
  database: requireStr("POSTGRES__READWRITE__DATABASE"),
  user: requireStr("POSTGRES__READWRITE__USER"),
  password: requireStr("POSTGRES__READWRITE__PASSWORD"),
  ssl: requireBool("POSTGRES__READWRITE__SSL"),
};

const buildPostgresConnectionString = (envVars: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}) => {
  const escapedPassword = encodeURIComponent(envVars.password);
  const sslMode = envVars.ssl ? "require" : "disable";
  return `postgres://${envVars.user}:${escapedPassword}@${envVars.host}:${envVars.port}/${envVars.database}?sslmode=${sslMode}`;
};

const cfg: Config = {
  schema: ["./src/_db/schema/index.ts", "./src/_db/schema/app-meta.ts"],
  dialect: "postgresql",
  out: "./db/migrations",
  dbCredentials: {
    url: buildPostgresConnectionString(envVars),
  },
  verbose: true,
  strict: getNodeEnv() !== "development",
  casing: "snake_case",
};

export default defineConfig(cfg);
