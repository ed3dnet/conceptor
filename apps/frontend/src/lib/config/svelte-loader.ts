// eslint-disable no-restricted-globals
import { LogLevelChecker } from "@myapp/shared-universal/config/types.js";
import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { EnsureTypeCheck } from "@myapp/shared-universal/utils/type-utils.js";

import { AppConfig } from "./types.js";

import * as env from "$env/static/private";

export function loadAppConfigFromSvelteEnv(): AppConfig {
  const ret: AppConfig = {
    env: env.NODE_ENV,
    logLevel: EnsureTypeCheck("info", LogLevelChecker),
    prettyLogs: env.NODE_ENV === "development",
    http: {
      port: Number(env.FRONTEND_PORT),
      logLevel: EnsureTypeCheck("info", LogLevelChecker),
    },
    urls: {
      frontendBaseUrl: env.FRONTEND_URLS__FRONTEND_BASE_URL,
      apiBaseUrl: env.FRONTEND_URLS__API_BASE_URL,
    },
    interop: {
      authCookieName: env.FRONTEND_INTEROP__AUTH_COOKIE_NAME,
    },
    insecure: {
      insecureCookies: env.FRONTEND_INSECURE__INSECURE_COOKIES === "1",
    },
  };

  const validate = AJV.compile(AppConfig);
  if (validate(ret)) {
    // if any values in config.insecure are true and we're running in production,
    // throw an error
    if (
      ret.env === "production" &&
      Object.values(ret.insecure).some((v) => v)
    ) {
      throw new Error("Insecure cookies are enabled in production.");
    }

    return ret as AppConfig;
  } else {
    process.stdout.write(JSON.stringify(validate.errors, null, 2) + "\n");
    throw new Error("Bad startup config.");
  }
}
