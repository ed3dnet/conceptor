/* eslint-disable no-restricted-globals */
import { LogLevelChecker } from "@myapp/shared-universal/config/types.js";
import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { EnsureTypeCheck } from "@myapp/shared-universal/utils/type-utils.js";
import { type TemporalConfig } from "@myapp/temporal-client/config.js";
import { load } from "js-yaml";

import { type AuthConfig } from "../domain/auth/config.js";
import { loadNatsConfigFromEnv } from "../lib/datastores/nats/config.js";
import { loadEventDispatchConfigFromEnv } from "../lib/functional/event-dispatch/config.js";
import { loadLlmPrompterConfigFromEnv } from "../lib/functional/llm-prompter/config.js";
import { S3FlavorChecker } from "../lib/functional/object-store/config.js";
import { loadTranscriptionConfigFromEnv } from "../lib/functional/transcription/config.js";

import {
  getBool,
  getMilliseconds,
  getNodeEnv,
  getNum,
  getStr,
  requireBool,
  requireJson,
  requireMilliseconds,
  requireNum,
  requireStr,
  requireStrList,
} from "./env-prefix.js";
import {
  AppConfig,
  type UrlsConfig,
  type BaseConfig,
  type InsecureOptionsConfig,
} from "./types.js";

export function loadBaseConfigFromEnv(): BaseConfig {
  return {
    env: getNodeEnv(),
    logLevel: EnsureTypeCheck(getStr("LOG_LEVEL", "info"), LogLevelChecker),
    prettyLogs: getBool("PRETTY_LOGS", false),

    ...loadInsecureOptionsConfigFromEnv(),
  };
}

function loadUrlsConfigFromEnv(): { urls: UrlsConfig } {
  return {
    urls: {
      frontendBaseUrl: requireStr("URLS__FRONTEND_BASE_URL"),
      apiBaseUrl: requireStr("URLS__API_BASE_URL"),
      s3BaseUrl: requireStr("URLS__S3_BASE_URL"),
      s3ExternalUrl: requireStr("URLS__S3_EXTERNAL_URL"),
    },
  };
}

function loadEmailDeliveryConfigFromEnv() {
  return {
    emailDelivery: {
      from: requireStr("EMAIL_DELIVERY__FROM"),
      replyTo: requireStr("EMAIL_DELIVERY__REPLY_TO"),
      smtp: {
        host: requireStr("EMAIL_DELIVERY__SMTP__HOST"),
        port: requireNum("EMAIL_DELIVERY__SMTP__PORT"),
        tls: requireBool("EMAIL_DELIVERY__SMTP__TLS"),
        auth: {
          user: requireStr("EMAIL_DELIVERY__SMTP__AUTH__USER"),
          pass: requireStr("EMAIL_DELIVERY__SMTP__AUTH__PASS"),
        },
      },
    },
  };
}

function loadMemorySwrConfigFromEnv() {
  return {
    memorySwr: {
      maxAge: getStr("MEMORY_SWR__MAX_AGE", "3h"),
      logSwrEvents: getBool("MEMORY_SWR__LOG_SWR_EVENTS", false),
    },
  };
}

export function loadRedisConfigFromEnv() {
  return {
    redis: {
      url: requireStr("REDIS__URL"),
      logSwrEvents: getBool("REDIS__LOG_SWR_EVENTS", false),
    },
  };
}

export function loadTemporalConfigFromEnv(): {
  temporal: TemporalConfig;
} {
  return {
    temporal: {
      address: requireStr("TEMPORAL__ADDRESS"),
      queues: {
        core: requireStr("TEMPORAL__QUEUES__CORE"),
        media: requireStr("TEMPORAL__QUEUES__MEDIA"),
      },
      namespace: getStr("TEMPORAL__NAMESPACE", "default"),
    },
  };
}

export function loadPostgresPoolConfigFromEnv(prefix: string) {
  return {
    host: requireStr(`${prefix}__HOST`),
    port: getNum(`${prefix}__PORT`, 5432),
    database: requireStr(`${prefix}__DATABASE`),
    user: requireStr(`${prefix}__USER`),
    password: requireStr(`${prefix}__PASSWORD`),
    ssl: getBool(`${prefix}__SSL`, false),
    poolSize: getNum(`${prefix}__POOL_SIZE`, 5),
    logLevel: EnsureTypeCheck(
      getStr(`${prefix}__LOG_LEVEL`, "info"),
      LogLevelChecker,
    ),
  };
}

export function loadPostgresConfigFromEnv() {
  return {
    postgres: {
      readonly: loadPostgresPoolConfigFromEnv("POSTGRES__READONLY"),
      readwrite: loadPostgresPoolConfigFromEnv("POSTGRES__READWRITE"),
    },
  };
}

function loadVaultConfigFromEnv() {
  return {
    vault: {
      primaryKey: requireStr("VAULT__PRIMARY_KEY"),
      legacyKeys: requireStrList("VAULT__LEGACY_KEYS", ",", true),
    },
  };
}

function loadAuthConfigFromEnv(): { auth: AuthConfig } {
  return {
    auth: {
      sessionCookie: {
        name: requireStr("AUTH__SESSION_COOKIE__NAME"),
        domain: requireStr("AUTH__SESSION_COOKIE__DOMAIN"),
        secure: getBool("AUTH__SESSION_COOKIE__SECURE", true),
        maxAgeMs: getMilliseconds("AUTH__SESSION_COOKIE__MAX_AGE", "30d"),
      },
      oauth: {
        statePasetoSymmetricKey: {
          type: "paseto-v3-local",
          key: requireStr("AUTH__OAUTH__STATE_PASETO_SYMMETRIC_KEY"),
        },
        stateExpirationSeconds: getNum(
          "AUTH__OAUTH__STATE_EXPIRATION_SECONDS",
          300,
        ),
      },
    },
  };
}

function loadS3ConfigFromEnv() {
  return {
    s3: {
      flavor: EnsureTypeCheck(requireStr("S3__FLAVOR"), S3FlavorChecker),
      endpoint: requireStr("S3__ENDPOINT"),
      port: getNum("S3__PORT", 443),
      ssl: getBool("S3__SSL", true),
      accessKey: requireStr("S3__ACCESS_KEY"),
      secretKey: requireStr("S3__SECRET_KEY"),
      buckets: {
        core: requireStr("S3__BUCKETS__CORE"),
        "user-content": requireStr("S3__BUCKETS__USER_PUBLIC_CONTENT"),
        "upload-staging": requireStr("S3__BUCKETS__UPLOAD_STAGING"),
      },
    },
  };
}

export function loadInsecureOptionsConfigFromEnv(): {
  insecureOptions: InsecureOptionsConfig;
} {
  return {
    insecureOptions: {
      insecurelyLogOAuth2Payloads: getBool(
        "INSECURE_OPTIONS__INSECURELY_LOG_OAUTH2_PAYLOADS",
        false,
      ),
      allowInsecureOpenIDProviders: getBool(
        "INSECURE_OPTIONS__ALLOW_INSECURE_OPENID_PROVIDERS",
        false,
      ),
    },
  };
}

export function normalAppConfig(): AppConfig {
  return {
    ...loadBaseConfigFromEnv(),
    ...loadUrlsConfigFromEnv(),
    ...loadMemorySwrConfigFromEnv(),
    ...loadRedisConfigFromEnv(),
    ...loadTemporalConfigFromEnv(),
    ...loadPostgresConfigFromEnv(),
    ...loadVaultConfigFromEnv(),
    ...loadS3ConfigFromEnv(),
    ...loadEmailDeliveryConfigFromEnv(),
    ...loadNatsConfigFromEnv(),

    ...loadLlmPrompterConfigFromEnv(),
    ...loadTranscriptionConfigFromEnv(),

    ...loadAuthConfigFromEnv(),
    ...loadEventDispatchConfigFromEnv(),
  };
}

export function loadAppConfigFromEnvNode(): AppConfig {
  const ret = normalAppConfig();
  if (!["development", "test"].includes(ret.env!)) {
    const insecureEntries = Object.entries(ret.insecureOptions!);

    if (insecureEntries.some(([k, v]) => v)) {
      console.error(`!!! Insecure options are enabled in ${ret.env} mode.`);
      console.error(`!!! The following insecure options are enabled:`);
      for (const [k, v] of insecureEntries) {
        if (v) {
          console.error(`  - ${k}`);
        }
      }
      throw new Error("Insecure options are enabled in production mode.");
    }
  }

  const validate = AJV.compile(AppConfig);
  if (validate(ret)) {
    return ret as AppConfig;
  } else {
    console.error(validate.errors);
    throw new Error("Bad startup config.");
  }
}
