import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UserIds } from "../../domain/users/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const userEmailSetPrimaryCommand = command({
  name: "user-email-set-primary",
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
      description: "The email that was set as primary",
    }),
  },
  handler: async ({ tenantId, userId, email }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-user-email-set-primary",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const events = ROOT_CONTAINER.resolve("events");

    await events.dispatchEvent({
      __type: "UserEmailSetPrimary",
      tenantId: TenantIds.ensure(tenantId),
      userId: UserIds.ensure(userId),
      email,
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info(
      { tenantId, userId, email },
      "Fired UserEmailSetPrimary event via CLI",
    );
  },
});
