import { type Static, Type } from "@sinclair/typebox";

import { getStr, requireStr } from "../../../_config/env-prefix.js";

export const ClaudeAnthropicStrategy = Type.Object({
  kind: Type.Literal("claude-anthropic"),
  anthropicApiKey: Type.String(),
  model: Type.String(/* { default: "claude-3-sonnet-20240229" } */),
  temperature: Type.Optional(Type.Number()),
  maxTokens: Type.Optional(Type.Number()),
});
export type ClaudeAnthropicStrategy = Static<typeof ClaudeAnthropicStrategy>;

export const GoogleGenAIStrategy = Type.Object({
  kind: Type.Literal("google-genai"),
  googleApiKey: Type.String(),
  model: Type.String(/* { default: "gemini-2.0-flash-001" } */),
  temperature: Type.Optional(Type.Number()),
  maxOutputTokens: Type.Optional(Type.Number()),
});
export type GoogleGenAIStrategy = Static<typeof GoogleGenAIStrategy>;

export const GoogleVertexAIStrategy = Type.Object({
  kind: Type.Literal("google-vertexai"),
  googleProjectId: Type.String(),
  googleLocation: Type.String({ default: "us-central1" }),
  model: Type.String(/* { default: "gemini-2.0-flash-001" } */),
  temperature: Type.Optional(Type.Number()),
  maxOutputTokens: Type.Optional(Type.Number()),
  credentialsJson: Type.Optional(Type.String()),
});
export type GoogleVertexAIStrategy = Static<typeof GoogleVertexAIStrategy>;

export const ModelStrategy = Type.Union([
  ClaudeAnthropicStrategy,
  GoogleGenAIStrategy,
  GoogleVertexAIStrategy,
]);

export const LlmModelConnectorName = Type.Union([
  Type.Literal("general"),
  Type.Literal("shortSummarization"),
]);
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
    model: requireStr(`${prefix}__MODEL`),
    temperature: parseFloat(getStr(`${prefix}__TEMPERATURE`, "1.0")),
    maxTokens: parseInt(getStr(`${prefix}__MAX_TOKENS`, "2000"), 10),
  };
}

export function loadGoogleGenAIStrategyFromEnv(prefix: string) {
  return {
    kind: "google-genai" as const,
    googleApiKey: requireStr(`${prefix}__GOOGLE_API_KEY`),
    model: requireStr(`${prefix}__MODEL`),
    temperature: parseFloat(getStr(`${prefix}__TEMPERATURE`, "1.0")),
    maxOutputTokens: parseInt(
      getStr(`${prefix}__MAX_OUTPUT_TOKENS`, "2000"),
      10,
    ),
  };
}

export function loadGoogleVertexAIStrategyFromEnv(prefix: string) {
  return {
    kind: "google-vertexai" as const,
    googleProjectId: requireStr(`${prefix}__GOOGLE_PROJECT_ID`),
    googleLocation: getStr(`${prefix}__GOOGLE_LOCATION`, "us-central1"),
    model: requireStr(`${prefix}__MODEL`),
    temperature: parseFloat(getStr(`${prefix}__TEMPERATURE`, "1.0")),
    maxOutputTokens: parseInt(
      getStr(`${prefix}__MAX_OUTPUT_TOKENS`, "2000"),
      10,
    ),
    credentialsJson: getStr(`${prefix}__CREDENTIALS_JSON`, ""),
  };
}

export function loadPrompterStrategyFromEnv(prefix: string) {
  const strategy = requireStr(`${prefix}__STRATEGY`);
  switch (strategy) {
    case "claude-anthropic":
      return loadClaudeAnthropicStrategyFromEnv(prefix);
    case "google-genai":
      return loadGoogleGenAIStrategyFromEnv(prefix);
    case "google-vertexai":
      return loadGoogleVertexAIStrategyFromEnv(prefix);
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
