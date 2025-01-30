import { subcommands } from "cmd-ts";

import { dbMigrateCommand } from "./migrate.js";

const subs = [dbMigrateCommand].sort((a, b) => a.name.localeCompare(b.name));

export const DB_CLI = subcommands({
  name: "db",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
