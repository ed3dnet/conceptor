import { LogLevel } from "@myapp/shared-universal/config/types.js";
import { type Static, Type } from "@sinclair/typebox";

export const PostgresHostConfig = Type.Object({
  host: Type.String(),
  port: Type.Number(),
  database: Type.String(),
  user: Type.String(),
  password: Type.String(),

  ssl: Type.Boolean(),

  logLevel: LogLevel,
  poolSize: Type.Number({ default: 5 }),
});
export type PostgresHostConfig = Static<typeof PostgresHostConfig>;

export const PostgresConfig = Type.Object({
  readonly: PostgresHostConfig,
  readwrite: PostgresHostConfig,
});
export type PostgresConfig = Static<typeof PostgresConfig>;
