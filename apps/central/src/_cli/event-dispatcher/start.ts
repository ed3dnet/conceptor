import { command, flag, oneOf, option } from "cmd-ts";

import { runEventDispatcher } from "../../_event-dispatch/runner.js";

export const eventDispatcherStartCommand = command({
  name: "start",
  args: {},
  handler: async (args) => {
    await runEventDispatcher();
  },
});
