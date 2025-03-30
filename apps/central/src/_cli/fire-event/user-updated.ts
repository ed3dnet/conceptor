import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UserIds } from "../../domain/users/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const userUpdatedCommand = command({
  name: "user-updated",
  args: {
    tenantId: option({
      type: string,
      long: "tenant-id",
      description: "The tenant ID",
    }),
    userId: option({
      type: string,
      long: "user-id",
      description: "The user ID",
    }),
    changedFields: option({
      type: string,
      long: "changed-fields",
      description: "Comma-separated list of changed fields",
    }),
  },
  handler: async ({ tenantId, userId, changedFields }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-user-updated",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomainBuilder(
      TenantIds.ensure(tenantId),
    );

    await tenantDomain.cradle.events.dispatchEvent({
      __type: "UserUpdated",
      tenantId: TenantIds.ensure(tenantId),
      userId: UserIds.ensure(userId),
      changedFields: changedFields.split(","),
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info(
      { tenantId, userId, changedFields },
      "Fired UserUpdated event via CLI",
    );
    process.exit(0);
  },
});
