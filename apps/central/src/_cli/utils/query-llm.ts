import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";
import { type LlmModelConnectorName } from "../../lib/functional/llm-prompter/config.js";

export const queryLlmCommand = command({
  name: "query-llm",
  args: {
    tenantId: option({
      type: string,
      long: "tenantId",
      description: "The tenant to register this LLM query to",
    }),
    connector: option({
      type: string,
      long: "connector",
      description: "Name of LLM connector to use (e.g. 'general')",
    }),
    prompt: option({
      type: string,
      long: "prompt",
      description: "Text prompt to send to the LLM",
    }),
  },
  handler: async ({ connector, prompt, tenantId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-query-llm",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomain(
      TenantIds.ensure(tenantId),
    );

    // right now, tenancy doesn't matter technically here, but in the
    // future it will for both attribution and custom LLM configurations.
    const llmPrompter = tenantDomain.cradle.llmPrompter;

    const response = await llmPrompter.immediateQuery(
      connector as LlmModelConnectorName,
      prompt,
    );

    // eslint-disable-next-line no-restricted-globals
    console.log(response);

    process.exit(0);
  },
});
