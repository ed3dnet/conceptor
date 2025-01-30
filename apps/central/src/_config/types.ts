import { LogLevel } from "@myapp/shared-universal/config/types.js";
import { TemporalConfig } from "@myapp/temporal-client/config.js";
import { type Static, Type } from "@sinclair/typebox";

import { EmailDeliveryConfig } from "../domain/email-delivery/config.js";
import { S3Config } from "../domain/object-store/config.js";
import { VaultConfig } from "../domain/vault/config.js";
import { MemorySWRConfig } from "../lib/datastores/memory-swr.js";
import { PostgresConfig } from "../lib/datastores/postgres/config.server.js";

export { LogLevel };

export const UrlsConfig = Type.Object({
  apiBaseUrl: Type.String({ format: "uri" }),
  s3BaseUrl: Type.String({ format: "uri" }),
  s3ExternalUrl: Type.String({ format: "uri" }),
});
export type UrlsConfig = Static<typeof UrlsConfig>;

export const RedisConfig = Type.Object({
  url: Type.String(),
  logSwrEvents: Type.Boolean(),
});
export type RedisConfig = Static<typeof RedisConfig>;

export const InsecureOptionsConfig = Type.Object({
  insecurelyLogOAuth2Payloads: Type.Boolean(),
});
export type InsecureOptionsConfig = Static<typeof InsecureOptionsConfig>;

export const BaseConfig = Type.Object({
  env: Type.String(),
  logLevel: LogLevel,
  prettyLogs: Type.Boolean(),

  insecureOptions: InsecureOptionsConfig,
});
export type BaseConfig = Static<typeof BaseConfig>;

export const AppConfig = Type.Intersect([
  BaseConfig,
  Type.Object({
    urls: UrlsConfig,

    redis: RedisConfig,
    memorySwr: MemorySWRConfig,
    temporal: TemporalConfig,
    emailDelivery: EmailDeliveryConfig,
    s3: S3Config,
    postgres: PostgresConfig,
    vault: VaultConfig,
  }),
]);
export type AppConfig = Static<typeof AppConfig>;
