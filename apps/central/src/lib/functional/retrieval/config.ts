import { type Static, Type } from "@sinclair/typebox";

import { getStr, requireStr } from "../../../_config/env-prefix.js";

export const VoyageAIStrategy = Type.Object({
  kind: Type.Literal("voyage-ai"),
  voyageApiKey: Type.String(),
  embeddingModel: Type.String(),
  rerankerModel: Type.Optional(Type.String()),
  dimensions: Type.Integer({ default: 2048 }),
});
export type VoyageAIStrategy = Static<typeof VoyageAIStrategy>;

export const RetrievalStrategy = Type.Union([
  VoyageAIStrategy,
  // Add other strategies here in the future
]);
export type RetrievalStrategy = Static<typeof RetrievalStrategy>;

export const RetrievalConfig = Type.Object({
  strategy: RetrievalStrategy,
  // Number of results to return by default if not specified
  defaultLimit: Type.Integer({ default: 10 }),
  // Default similarity threshold (0-1)
  defaultMinSimilarity: Type.Number({ default: 0.7, minimum: 0, maximum: 1 }),
});
export type RetrievalConfig = Static<typeof RetrievalConfig>;

export function loadVoyageAIStrategyFromEnv() {
  return {
    kind: "voyage-ai" as const,
    voyageApiKey: requireStr(`RETRIEVAL__VOYAGE_API_KEY`),
    embeddingModel: requireStr(`RETRIEVAL__EMBEDDING_MODEL`),
    rerankerModel: requireStr(`RETRIEVAL__RERANKER_MODEL`),
    dimensions: parseInt(getStr(`RETRIEVAL__DIMENSIONS`, "1024"), 10),
  };
}

export function loadRetrievalStrategyFromEnv() {
  const strategy = requireStr(`RETRIEVAL__STRATEGY`);
  switch (strategy) {
    case "voyage-ai":
      return loadVoyageAIStrategyFromEnv();
    default:
      throw new Error(`Unknown retrieval strategy: ${strategy}`);
  }
}

export function loadRetrievalConfigFromEnv() {
  return {
    retrieval: {
      strategy: loadRetrievalStrategyFromEnv(),
      defaultLimit: parseInt(getStr("RETRIEVAL__DEFAULT_LIMIT", "10"), 10),
      defaultMinSimilarity: parseFloat(
        getStr("RETRIEVAL__DEFAULT_MIN_SIMILARITY", "0.7"),
      ),
    },
  };
}
