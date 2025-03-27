import { command, option, optional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UnitIds } from "../../domain/units/id.js";
import { UserIds } from "../../domain/users/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const userAssignedToUnitCommand = command({
  name: "user-assigned-to-unit",
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
    startDate: option({
      type: optional(string),
      long: "start-date",
      description: "The assignment start date (ISO format, optional)",
    }),
    endDate: option({
      type: optional(string),
      long: "end-date",
      description: "The assignment end date (ISO format, optional)",
    }),
  },
  handler: async ({ tenantId, unitId, userId, startDate, endDate }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-user-assigned-to-unit",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    await ROOT_CONTAINER.cradle.events.dispatchEvent({
      __type: "UserAssignedToUnit",
      tenantId: TenantIds.ensure(tenantId),
      unitId: UnitIds.ensure(unitId),
      userId: UserIds.ensure(userId),
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || undefined,
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info(
      { tenantId, unitId, userId },
      "Fired UserAssignedToUnit event",
    );
    process.exit(0);
  },
});
