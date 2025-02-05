import { command, option, string, optional, number } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { type LlmModelConnectorName } from "../../domain/llm-prompter/config.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const queryLlmCommand = command({
  name: "query-llm",
  args: {
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
  handler: async ({ connector, prompt }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-query-llm",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const llmPrompter = ROOT_CONTAINER.cradle.llmPrompter;

    const response = await llmPrompter.immediateQuery(
      connector as LlmModelConnectorName,
      prompt,
    );

    // eslint-disable-next-line no-restricted-globals
    console.log(response);

    process.exit(0);
  },
});
