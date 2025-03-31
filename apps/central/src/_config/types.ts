import { LogLevel } from "@myapp/shared-universal/config/types.js";
import { TemporalConfig } from "@myapp/temporal-client/config.js";
import { type Static, Type } from "@sinclair/typebox";

import { AuthConfig } from "../domain/auth/config.js";
import { MemorySWRConfig } from "../lib/datastores/memory-swr.js";
import { PostgresConfig } from "../lib/datastores/postgres/config.js";
import { EmailDeliveryConfig } from "../lib/functional/email-delivery/config.js";
import { LlmPrompterConfig } from "../lib/functional/llm-prompter/config.js";
import { S3Config } from "../lib/functional/object-store/config.js";
import { RetrievalConfig } from "../lib/functional/retrieval/config.js";
import { TranscriptionConfig } from "../lib/functional/transcription/config.js";
import { VaultConfig } from "../lib/functional/vault/config.js";

export { LogLevel };

export const UrlsConfig = Type.Object({
  frontendBaseUrl: Type.String({ format: "uri" }),
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
  allowInsecureOpenIDProviders: Type.Boolean(),
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

    llmPrompter: LlmPrompterConfig,
    transcription: TranscriptionConfig,
    retrieval: RetrievalConfig,

    auth: AuthConfig,
  }),
]);
export type AppConfig = Static<typeof AppConfig>;
