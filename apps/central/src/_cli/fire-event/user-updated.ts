import { command, option, string, array, multioption } from "cmd-ts";

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
    fields: multioption({
      type: array(string),
      long: "fields",
      description: "The fields that were changed",
    }),
  },
  handler: async ({ tenantId, userId, fields: changedFields }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-user-updated",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const events = ROOT_CONTAINER.resolve("events");

    await events.dispatchEvent({
      __type: "UserUpdated",
      tenantId: TenantIds.ensure(tenantId),
      userId: UserIds.ensure(userId),
      changedFields,
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info(
      { tenantId, userId, changedFields },
      "Fired UserUpdated event via CLI",
    );
  },
});
