import { type Static, Type } from "@sinclair/typebox";

import { getStr, requireStr } from "../../_config/env-prefix.js";
import { LLM_CONNECTOR_NAME } from "../../_db/schema/index.js";
import { StringEnum } from "../../lib/ext/typebox.js";

export const ClaudeAnthropicStrategy = Type.Object({
  kind: Type.Literal("claude-anthropic"),
  anthropicApiKey: Type.String(),
  model: Type.String({ default: "claude-3-sonnet-20240229" }),
  temperature: Type.Optional(Type.Number()),
  maxTokens: Type.Optional(Type.Number()),
});
export type ClaudeAnthropicStrategy = Static<typeof ClaudeAnthropicStrategy>;

export const ModelStrategy = Type.Union([ClaudeAnthropicStrategy]);

export const LlmModelConnectorName = Type.Union(
  LLM_CONNECTOR_NAME.enumValues.map((v) => Type.Literal(v)),
);
export type LlmModelConnectorName = Static<typeof LlmModelConnectorName>;

export const LlmPrompterConfig = Type.Object({
  modelConnectors: Type.Object({
    general: Type.Object({
      strategy: ModelStrategy,
    }),
  }),
});
export type LlmPrompterConfig = Static<typeof LlmPrompterConfig>;

export function loadClaudeAnthropicStrategyFromEnv(prefix: string) {
  return {
    kind: "claude-anthropic" as const,
    anthropicApiKey: requireStr(`${prefix}__ANTHROPIC_API_KEY`),
    model: getStr(`${prefix}__MODEL`, "claude-3-5-sonnet-20241022"),
    temperature: parseFloat(getStr(`${prefix}__TEMPERATURE`, "0.7")),
    maxTokens: parseInt(getStr(`${prefix}__MAX_TOKENS`, "2000"), 10),
  };
}

export function loadPrompterStrategyFromEnv(prefix: string) {
  const strategy = requireStr(`${prefix}__STRATEGY`);
  switch (strategy) {
    case "claude-anthropic":
      return loadClaudeAnthropicStrategyFromEnv(prefix);
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}

export function loadLlmPrompterConfigFromEnv() {
  return {
    llmPrompter: {
      modelConnectors: {
        general: {
          strategy: loadPrompterStrategyFromEnv(
            "LLM_PROMPTER__MODEL_CONNECTORS__GENERAL",
          ),
        },
      },
    },
  };
}
