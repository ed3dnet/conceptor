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

import { WorkerAppConfig } from "./types.js";

export function loadWorkerConfigFromEnvNode(): WorkerAppConfig {
  const ret: WorkerAppConfig = {
    ...loadAppConfigFromEnvNode(),
  };

  const validate = AJV.compile(WorkerAppConfig);
  if (validate(ret)) {
    return ret as WorkerAppConfig;
  } else {
    // eslint-disable-next-line no-restricted-globals
    console.error(validate.errors);
    throw new Error("Bad startup config.");
  }

  return ret;
}
