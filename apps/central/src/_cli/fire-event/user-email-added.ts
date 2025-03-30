import { boolean, command, flag, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { UserIds } from "../../domain/users/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const userEmailAddedCommand = command({
  name: "user-email-added",
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
      description: "The email that was added",
    }),
    isPrimary: flag({
      long: "is-primary",
      description: "Whether the email is primary",
      defaultValue: () => false,
    }),
  },
  handler: async ({ tenantId, userId, email, isPrimary }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-fire-event-user-email-added",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomainBuilder(
      TenantIds.ensure(tenantId),
    );

    await tenantDomain.cradle.events.dispatchEvent({
      __type: "UserEmailAdded",
      tenantId: TenantIds.ensure(tenantId),
      userId: UserIds.ensure(userId),
      email,
      isPrimary,
      timestamp: new Date().toISOString(),
    });

    ROOT_LOGGER.info(
      { tenantId, userId, email, isPrimary },
      "Fired UserEmailAdded event via CLI",
    );
  },
});
