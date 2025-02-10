import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { AuthConnectorService } from "../../domain/auth-connectors/service.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const testOpenidConfigCommand = command({
  name: "test-openid-config",
  args: {
    url: option({
      type: string,
      long: "url",
      description: "URL of the OpenID configuration endpoint",
    }),
  },
  handler: async ({ url }) => {
    const { ROOT_CONTAINER } = await bootstrapNode(
      "cli-test-openid-config",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const response = await AuthConnectorService.fetchOpenIDConfiguration(
      ROOT_CONTAINER.cradle.logger,
      ROOT_CONTAINER.cradle.fetch,
      url,
    );

    // eslint-disable-next-line no-restricted-globals
    console.log(JSON.stringify(response, null, 2));

    process.exit(0);
  },
});
