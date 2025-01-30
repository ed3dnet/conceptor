import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";
import { seed } from "../../lib/seeder/index.js";

export const seedApplyCommand = command({
  name: "apply",
  args: {
    environment: option({
      type: string,
      long: "environment",
      short: "e",
      defaultValue: () => process.env.NODE_ENV ?? "development",
      description:
        "sets the environment that should run this seed. defaults to development.",
    }),
  },
  handler: async ({ environment }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-seeder",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    ROOT_LOGGER.info({ environment }, "Running seed.");
    await seed(environment, ROOT_CONTAINER.cradle);
  },
});
