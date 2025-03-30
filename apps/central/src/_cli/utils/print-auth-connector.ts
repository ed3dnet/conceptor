import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { AuthConnectorIds } from "../../domain/auth-connectors/id.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const printAuthConnectorCommand = command({
  name: "print-auth-connector",
  args: {
    tenantId: option({
      type: string,
      long: "tenant-id",
      description: "ID of the tenant to use",
    }),
    connectorId: option({
      type: string,
      long: "connector-id",
      description: "ID of the auth connector to inspect",
    }),
  },
  handler: async ({ tenantId, connectorId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-print-auth-connector",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomainBuilder(
      TenantIds.ensure(tenantId),
    );

    const authConnectorService = tenantDomain.cradle.authConnectors;
    const vaultService = ROOT_CONTAINER.cradle.vault;

    const connector = await authConnectorService.getById(
      AuthConnectorIds.ensure(connectorId),
    );
    if (!connector) {
      throw new NotFoundError(`Auth connector not found: ${connectorId}`);
    }

    const decryptedState = await vaultService.decrypt(connector.state);

    // eslint-disable-next-line no-restricted-globals
    console.log(JSON.stringify(decryptedState, null, 2));

    process.exit(0);
  },
});
