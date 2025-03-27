import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const userUnassignedFromUnitCommand = command({
  name: "user-unassigned-from-unit",
  args: {
    tenantId: option({
      type: string,
      long: "tenant-id",
      description: "The tenant ID",
    }),
    unitId: option({
      type: string,
      long: "unit-id",
      description: "The unit ID",
    }),
    userId: option({
      type: string,
      long: "user-id",
      description: "The user ID",
    }),
  },
  handler: async ({ tenantId, unitId, userId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-user-unassigned-from-unit",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    await ROOT_CONTAINER.cradle.events.dispatchEvent({
      __type: "UserUnassignedFromUnit",
      tenantId,
      unitId,
      userId,
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info(
      { tenantId, unitId, userId },
      "Fired UserUnassignedFromUnit event",
    );
    process.exit(0);
  },
});
