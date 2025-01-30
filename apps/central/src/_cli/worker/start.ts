import { type TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import { command, oneOf, positional, string } from "cmd-ts";

import { workerMain } from "../../_worker/index.js";

export const workerStartCommand = command({
  name: "start",
  args: {
    workerType: positional({
      type: oneOf(["core", "media", "atproto", "identity"]),
      displayName: "worker type",
      description: "the type of worker to start",
    }),
  },
  handler: async (args) => {
    await workerMain(args.workerType as keyof TemporalQueueConfig);
  },
});
