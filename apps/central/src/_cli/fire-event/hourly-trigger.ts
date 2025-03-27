import { command } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const hourlyTriggerCommand = command({
  name: "hourly-trigger",
  args: {},
  handler: async () => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-hourly-trigger",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const logger = ROOT_LOGGER.child({ command: "hourly-trigger" });
    const events = ROOT_CONTAINER.cradle.events;

    logger.info("Manually triggering hourly event");

    await events.dispatchEvent({
      __type: "HourlyTrigger",
    });

    logger.info("Hourly trigger event dispatched successfully");
    process.exit(0);
  },
});
