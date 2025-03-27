import { command } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const dailyTriggerCommand = command({
  name: "daily-trigger",
  args: {},
  handler: async () => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-daily-trigger",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const logger = ROOT_LOGGER.child({ command: "daily-trigger" });
    const events = ROOT_CONTAINER.cradle.events;

    logger.info("Manually triggering daily event");

    await events.dispatchEvent({
      __type: "DailyTrigger",
    });

    logger.info("Daily trigger event dispatched successfully");
    process.exit(0);
  },
});
