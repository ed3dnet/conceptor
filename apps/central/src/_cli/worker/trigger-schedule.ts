import { TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import { ScheduleOverlapPolicy } from "@temporalio/client";
import { command, oneOf, positional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const triggerScheduleCommand = command({
  name: "trigger-schedule",
  args: {
    queue: positional({
      type: oneOf(Object.keys(TemporalQueueConfig.properties)),
      displayName: "queue",
      description: "The queue containing the schedule",
    }),
    scheduleName: positional({
      type: string,
      displayName: "schedule name",
      description: "The name of the schedule to trigger",
    }),
  },
  handler: async ({ queue, scheduleName }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-trigger-schedule",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    await ROOT_CONTAINER.cradle.temporalDispatch.triggerWorkflow(
      queue as keyof TemporalQueueConfig,
      scheduleName,
      ScheduleOverlapPolicy.SKIP,
    );

    ROOT_LOGGER.info({ queue, scheduleName }, "Triggered scheduled workflow");
    process.exit(0);
  },
});
