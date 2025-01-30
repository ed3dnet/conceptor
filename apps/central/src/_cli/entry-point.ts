import { run } from "cmd-ts";

import { ROOT_CLI } from "./index.js";

if (!process.env.NODE_ENV) {
  throw new Error(
    "NODE_ENV not set. Make sure you've set an environment file.",
  );
}

run(ROOT_CLI, process.argv.slice(2));
