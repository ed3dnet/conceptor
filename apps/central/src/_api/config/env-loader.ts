import { LogLevelChecker } from "@myapp/shared-universal/config/types.js";
import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { EnsureTypeCheck } from "@myapp/shared-universal/utils/type-utils.js";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import {
  getBool,
  getNum,
  getStr,
  requireStr,
} from "../../_config/env-prefix.js";

import { type HttpConfig } from "./http-types.js";
import { ApiAppConfig } from "./types.js";

export function loadHttpConfigFromEnv(prefix?: string): { http: HttpConfig } {
  return {
    http: {
      port: getNum([prefix, "HTTP__PORT"].filter(Boolean).join("__"), 5000),
      logLevel: EnsureTypeCheck(
        getStr([prefix, "HTTP__LOG_LEVEL"].filter(Boolean).join("__"), "info"),
        LogLevelChecker,
      ),
      emitStackOnErrors: getBool("HTTP__EMIT_STACK_ON_ERRORS", false),
    },
  };
}

export function loadApiConfigFromEnvNode(): ApiAppConfig {
  const ret: ApiAppConfig = {
    ...loadAppConfigFromEnvNode(),
    ...loadHttpConfigFromEnv(),
    interop: {
      tenantPreSharedKey: requireStr("INTEROP__TENANT_PRE_SHARED_KEY"),
      panelPreSharedKey: requireStr("INTEROP__PANEL_PRE_SHARED_KEY"),
    },
  };

  const validate = AJV.compile(ApiAppConfig);
  if (validate(ret)) {
    return ret as ApiAppConfig;
  } else {
    // eslint-disable-next-line no-restricted-globals
    console.error(validate.errors);
    throw new Error("Bad startup config.");
  }
}
