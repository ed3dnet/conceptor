import * as FS from "node:fs/promises";
import * as Path from "node:path";

import { command, option, positional, string } from "cmd-ts";

const seedDir = Path.join(
  Path.dirname(new URL(import.meta.url).pathname),
  "../../_db/seeds",
);

export const seedNewCommand = command({
  name: "new",
  args: {
    environment: option({
      type: string,
      long: "environment",
      short: "e",
      defaultValue: () => "development",
      description:
        "sets the environment that should run this seed. defaults to development.",
    }),
    name: positional({
      type: string,
      displayName: "name",
      description: "The name of the seed to create",
    }),
  },
  handler: async ({ name, environment }) => {
    // copy skeletonSeedFile to a new file. The start of the name should be
    // the current unix time in milliseconds, with `name` appended.

    const now = Date.now();

    const filename = `${now}-${name}.ts`;

    const skeletonSeedFile = Path.join(
      seedDir,
      environment.toLowerCase(),
      "_skeleton.ts",
    );
    const newSeedFile = `${seedDir}/${environment.toLowerCase()}/${filename}`;

    await FS.copyFile(skeletonSeedFile, newSeedFile);
    // eslint-disable-next-line no-restricted-globals
    console.log(`Created new seed file: ${newSeedFile}`);
  },
});
