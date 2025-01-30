import { buildStandardLogger } from "@myapp/shared-universal/utils/logging.js";

import { type AppConfig } from "../../_config/types.js";
import { configureBaseAwilixContainer } from "../../_deps/index.js";
import { doDatabaseMigration } from "../datastores/postgres/migrator.server.js";

export type BootstrapArgs = {
  skipMigrations?: boolean | "skip-in-development";
};

export async function bootstrapFromConfig<TAppConfig extends AppConfig>(
  loggerName: string,
  config: TAppConfig,
  args: BootstrapArgs = {},
) {
  const ROOT_LOGGER = buildStandardLogger(loggerName, config.logLevel, {
    useStdout: false,
    prettyPrint: config.prettyLogs,
  });

  const ROOT_CONTAINER = await configureBaseAwilixContainer(
    config,
    ROOT_LOGGER,
  );

  const shouldSkipMigrations =
    args.skipMigrations === true ||
    (args.skipMigrations === "skip-in-development" &&
      config.env === "development");
  if (!shouldSkipMigrations) {
    ROOT_LOGGER.info("doing DB migration at startup");
    await doDatabaseMigration(ROOT_CONTAINER.cradle);
  }

  return { APP_CONFIG: config, ROOT_LOGGER, ROOT_CONTAINER };
}
