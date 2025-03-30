import { command, oneOf, option, optional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UnitIds } from "../../domain/units/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const unitCreatedCommand = command({
  name: "unit-created",
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
    name: option({
      type: string,
      long: "name",
      description: "The unit name",
    }),
    type: option({
      type: oneOf(["individual", "organizational"]),
      long: "type",
      description: "The unit type (individual or organizational)",
    }),
    parentUnitId: option({
      // either type optional() or defaultValue: () => "value" signal that
      // an option is not required on the command line.
      type: optional(string),
      long: "parent-unit-id",
      description: "The parent unit ID (optional)",
    }),
  },
  handler: async ({ tenantId, unitId, name, type, parentUnitId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-unit-created",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomainBuilder(
      TenantIds.ensure(tenantId),
    );

    await tenantDomain.cradle.events.dispatchEvent({
      __type: "UnitCreated",
      tenantId: TenantIds.ensure(tenantId),
      unitId: UnitIds.ensure(unitId),
      name,
      type: type as "individual" | "organizational",
      parentUnitId: parentUnitId ? UnitIds.ensure(parentUnitId) : null,
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info({ tenantId, unitId }, "Fired UnitCreated event");
    process.exit(0);
  },
});
