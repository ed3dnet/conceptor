import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { type AppConfig } from "../../_config/types.js";

import { type BootstrapArgs, bootstrapFromConfig } from "./shared.js";

export async function bootstrapNode<TAppConfig extends AppConfig>(
  loggerName: string,
  appConfig: TAppConfig,
  args: BootstrapArgs = {},
) {
  return await bootstrapFromConfig(loggerName, appConfig, args);
}
