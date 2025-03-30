import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UnitIds } from "../../domain/units/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const unitDeletedCommand = command({
  name: "unit-deleted",
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
  },
  handler: async ({ tenantId, unitId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-unit-deleted",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomainBuilder(
      TenantIds.ensure(tenantId),
    );

    await tenantDomain.cradle.events.dispatchEvent({
      __type: "UnitDeleted",
      tenantId: TenantIds.ensure(tenantId),
      unitId: UnitIds.ensure(unitId),
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info({ tenantId, unitId }, "Fired UnitDeleted event");
    process.exit(0);
  },
});
