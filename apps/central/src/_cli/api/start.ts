import { command, flag, oneOf, option } from "cmd-ts";
import * as pino from "pino";

import { apiMain } from "../../_api/index.js";

export const apiStartCommand = command({
  name: "start",
  args: {
    migration: option({
      short: "m",
      long: "migrations",
      type: oneOf(["yes", "no", "skip-in-development"]),
      defaultValue: () => "skip-in-development",
    }),
  },
  handler: async (args) => {
    let skipMigrations: boolean | "skip-in-development" = "skip-in-development";

    if (args.migration !== "skip-in-development") {
      skipMigrations = args.migration === "no";
    }

    await apiMain({
      skipMigrations,
    });
  },
});
