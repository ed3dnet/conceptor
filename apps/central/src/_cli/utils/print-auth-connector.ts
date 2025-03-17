import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const printAuthConnectorCommand = command({
  name: "print-auth-connector",
  args: {
    connectorId: option({
      type: string,
      long: "connector-id",
      description: "ID of the auth connector to inspect",
    }),
  },
  handler: async ({ connectorId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-print-auth-connector",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const authConnectorService = ROOT_CONTAINER.cradle.authConnectors;
    const vaultService = ROOT_CONTAINER.cradle.vault;

    const connector = await authConnectorService.getById(connectorId);
    if (!connector) {
      throw new NotFoundError(`Auth connector not found: ${connectorId}`);
    }

    const decryptedState = await vaultService.decrypt(connector.state);

    // eslint-disable-next-line no-restricted-globals
    console.log(JSON.stringify(decryptedState, null, 2));

    process.exit(0);
  },
});
