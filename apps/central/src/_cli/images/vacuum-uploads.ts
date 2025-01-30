import { command } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { vacuumUploadsWorkflow } from "../../domain/images/workflows/vacuum-uploads.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const vacuumUploadsCommand = command({
  name: "vacuum-uploads",
  args: {},
  handler: async () => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-vacuum-uploads",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const temporalDispatch = ROOT_CONTAINER.cradle.temporalDispatch;
    await temporalDispatch.startMedia(vacuumUploadsWorkflow, []);

    ROOT_LOGGER.info("Started vacuum uploads workflow");
    process.exit(0);
  },
});
