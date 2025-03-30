import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UserIds } from "../../domain/users/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const userCreatedCommand = command({
  name: "user-created",
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
    email: option({
      type: string,
      long: "email",
      description: "The user's email",
    }),
    displayName: option({
      type: string,
      long: "display-name",
      description: "The user's display name",
    }),
  },
  handler: async ({ tenantId, userId, email, displayName }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-user-created",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomainBuilder(
      TenantIds.ensure(tenantId),
    );

    await tenantDomain.cradle.events.dispatchEvent({
      __type: "UserCreated",
      tenantId: TenantIds.ensure(tenantId),
      userId: UserIds.ensure(userId),
      email,
      displayName,
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info(
      { tenantId, userId, email },
      "Fired UserCreated event via CLI",
    );
  },
});
