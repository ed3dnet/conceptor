import { command } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";
import { doDatabaseMigration } from "../../lib/datastores/postgres/migrator.server.js";

export const dbMigrateCommand = command({
  name: "migrate",
  args: {},
  handler: async (args) => {
    const { ROOT_CONTAINER } = await bootstrapNode(
      "db-migrate",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    await doDatabaseMigration(ROOT_CONTAINER.cradle);
  },
});
