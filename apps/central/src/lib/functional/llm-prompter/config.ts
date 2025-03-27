import { type Static, Type } from "@sinclair/typebox";

import { getStr, requireStr } from "../../../_config/env-prefix.js";
import { LLM_CONNECTOR_NAME } from "../../../_db/schema/index.js";
import { StringEnum } from "../../ext/typebox/index.js";

export const ClaudeAnthropicStrategy = Type.Object({
  kind: Type.Literal("claude-anthropic"),
  anthropicApiKey: Type.String(),
  model: Type.String({ default: "claude-3-sonnet-20240229" }),
  temperature: Type.Optional(Type.Number()),
  maxTokens: Type.Optional(Type.Number()),
});
export type ClaudeAnthropicStrategy = Static<typeof ClaudeAnthropicStrategy>;

export const GoogleGenAIStrategy = Type.Object({
  kind: Type.Literal("google-genai"),
  googleApiKey: Type.String(),
  model: Type.String({ default: "gemini-2.0-flash" }),
  temperature: Type.Optional(Type.Number()),
  maxOutputTokens: Type.Optional(Type.Number()),
});
export type GoogleGenAIStrategy = Static<typeof GoogleGenAIStrategy>;

export const ModelStrategy = Type.Union([
  ClaudeAnthropicStrategy,
  GoogleGenAIStrategy,
]);

export const LlmModelConnectorName = Type.Union(
  LLM_CONNECTOR_NAME.enumValues.map((v) => Type.Literal(v)),
);
export type LlmModelConnectorName = Static<typeof LlmModelConnectorName>;

export const LlmPrompterConfig = Type.Object({
  modelConnectors: Type.Object({
    general: Type.Object({
      strategy: ModelStrategy,
    }),
    shortSummarization: Type.Object({
      strategy: ModelStrategy,
    }),
  }),
});
export type LlmPrompterConfig = Static<typeof LlmPrompterConfig>;

export function loadClaudeAnthropicStrategyFromEnv(prefix: string) {
  return {
    kind: "claude-anthropic" as const,
    anthropicApiKey: requireStr(`${prefix}__ANTHROPIC_API_KEY`),
    model: getStr(`${prefix}__MODEL`, "claude-3-7-sonnet-latest"),
    temperature: parseFloat(getStr(`${prefix}__TEMPERATURE`, "0.7")),
    maxTokens: parseInt(getStr(`${prefix}__MAX_TOKENS`, "2000"), 10),
  };
}

export function loadGoogleGenAIStrategyFromEnv(prefix: string) {
  return {
    kind: "google-genai" as const,
    googleApiKey: requireStr(`${prefix}__GOOGLE_API_KEY`),
    model: getStr(`${prefix}__MODEL`, "gemini-2.0-flash"),
    temperature: parseFloat(getStr(`${prefix}__TEMPERATURE`, "0.7")),
    maxOutputTokens: parseInt(
      getStr(`${prefix}__MAX_OUTPUT_TOKENS`, "2000"),
      10,
    ),
  };
}

export function loadPrompterStrategyFromEnv(prefix: string) {
  const strategy = requireStr(`${prefix}__STRATEGY`);
  switch (strategy) {
    case "claude-anthropic":
      return loadClaudeAnthropicStrategyFromEnv(prefix);
    case "google-genai":
      return loadGoogleGenAIStrategyFromEnv(prefix);
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
        shortSummarization: {
          strategy: loadPrompterStrategyFromEnv(
            "LLM_PROMPTER__MODEL_CONNECTORS__SHORT_SUMMARIZATION",
          ),
        },
      },
    },
  };
}
