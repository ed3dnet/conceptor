import { subcommands } from "cmd-ts";

import { eventDispatcherStartCommand } from "./start.js";

const subs = [eventDispatcherStartCommand].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const EVENT_DISPATCHER_CLI = subcommands({
  name: "event-dispatcher",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
