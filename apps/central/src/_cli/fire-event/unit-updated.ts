import { command, option, optional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UnitIds } from "../../domain/units/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const unitUpdatedCommand = command({
  name: "unit-updated",
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
    changedFields: option({
      type: string,
      long: "changed-fields",
      description: "Comma-separated list of changed fields",
    }),
  },
  handler: async ({ tenantId, unitId, changedFields }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-unit-updated",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    await ROOT_CONTAINER.cradle.events.dispatchEvent({
      __type: "UnitUpdated",
      tenantId: TenantIds.ensure(tenantId),
      unitId: UnitIds.ensure(unitId),
      changedFields: changedFields.split(","),
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info({ tenantId, unitId }, "Fired UnitUpdated event");
    process.exit(0);
  },
});
