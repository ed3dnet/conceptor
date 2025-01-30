import { subcommands } from "cmd-ts";

import { seedApplyCommand } from "./apply.js";
import { seedNewCommand } from "./new.js";

const subs = [seedApplyCommand, seedNewCommand].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const SEED_CLI = subcommands({
  name: "seed",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
