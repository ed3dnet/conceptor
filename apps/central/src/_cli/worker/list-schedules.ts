import { TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import { command, oneOf, optional, positional, string } from "cmd-ts";

import { TEMPORAL_SCHEDULED_WORKFLOWS } from "../../_worker/schedules.js";

export const workerListSchedulesCommand = command({
  name: "list-schedules",
  args: {
    workerType: positional({
      type: optional(oneOf(Object.keys(TemporalQueueConfig.properties))),
      displayName: "list scheduled jobs",
    }),
  },
  handler: async (args) => {
    const ret = args.workerType
      ? {
          [args.workerType]: Object.entries(
            TEMPORAL_SCHEDULED_WORKFLOWS[
              args.workerType as keyof TemporalQueueConfig
            ],
          )
            .filter(([_, v]) => v !== null)
            .map(([k]) => k),
        }
      : Object.fromEntries(
          Object.keys(TEMPORAL_SCHEDULED_WORKFLOWS).map((queue) => [
            queue,
            Object.entries(
              TEMPORAL_SCHEDULED_WORKFLOWS[queue as keyof TemporalQueueConfig],
            )
              .filter(([_, v]) => v !== null)
              .map(([k]) => k),
          ]),
        );

    process.stdout.write(JSON.stringify(ret, null, 2) + "\n");
  },
});
