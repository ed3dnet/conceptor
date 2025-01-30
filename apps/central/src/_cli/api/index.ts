import { subcommands } from "cmd-ts";

import { apiStartCommand } from "./start.js";

const subs = [apiStartCommand].sort((a, b) => a.name.localeCompare(b.name));

export const API_CLI = subcommands({
  name: "api",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
