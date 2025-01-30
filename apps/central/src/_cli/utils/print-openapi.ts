import { command } from "cmd-ts";

import { loadApiConfigFromEnvNode } from "../../_api/config/env-loader.js";
import { buildServer } from "../../_api/http/index.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const printOpenapiCommand = command({
  name: "print-openapi",
  args: {},
  handler: async () => {
    const { APP_CONFIG, ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "openapi-print",
      loadApiConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    ROOT_LOGGER.level = "silent";

    // fetch from `${config.urls.apiBaseUrl}/openapi.json`
    const response = await (
      await buildServer(APP_CONFIG, ROOT_LOGGER, ROOT_CONTAINER)
    ).inject({
      method: "GET",
      url: "/openapi.json",
    });

    const document = JSON.parse(response.body);

    const json = JSON.stringify(document, null, 2);

    // eslint-disable-next-line no-restricted-globals
    console.log(json);
    process.exit(0);
  },
});
