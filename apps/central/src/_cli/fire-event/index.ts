import { subcommands } from "cmd-ts";

import { dailyTriggerCommand } from "./daily-trigger.js";
import { hourlyTriggerCommand } from "./hourly-trigger.js";

const subs = [dailyTriggerCommand, hourlyTriggerCommand].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const FIRE_EVENT_CLI = subcommands({
  name: "fire-event",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
