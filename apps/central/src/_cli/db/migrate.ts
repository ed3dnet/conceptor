import { command } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";
import { doDatabaseMigration } from "../../lib/datastores/postgres/migrator.js";
import { logActiveProcessResources } from "../../lib/utils/process-diagnostics.js";

export const dbMigrateCommand = command({
  name: "migrate",
  args: {},
  handler: async (args) => {
    const { ROOT_CONTAINER, ROOT_LOGGER } = await bootstrapNode(
      "db-migrate",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    await doDatabaseMigration(ROOT_CONTAINER.cradle);
    ROOT_LOGGER.info("Disposing container");
    await ROOT_CONTAINER.dispose();
    process.exit(0);
  },
});
