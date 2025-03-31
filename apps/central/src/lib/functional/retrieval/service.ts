import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import type { Embeddings } from "@langchain/core/embeddings";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { Logger } from "pino";

import type { DBEmbedding } from "../../../_db/models.js";
import { EMBEDDINGS } from "../../../_db/schema/index.js";
import { type TenantId, TenantIds } from "../../../domain/tenants/id.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../datastores/postgres/types.js";
import { type StringUUID } from "../../ext/typebox/index.js";

import type { RetrievalConfig } from "./config.js";

export type EmbeddingSourceType = "answer" | "insight";

export interface CreateEmbeddingInput {
  sourceType: EmbeddingSourceType;
  sourceId: StringUUID;
  textContent: string;
  chunkIndex?: number;
  isChunked?: boolean;
}

export interface RetrievalResult {
  sourceType: EmbeddingSourceType;
  sourceId: StringUUID;
  textContent: string;
  similarity: number;
  isChunked: boolean;
  chunkIndex?: number;
  rerankerScore?: number;
}

export class RetrievalService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;
  private embeddings: Embeddings | null = null;
  // TODO:  this will need to support reranker types when we get there
  //        Langchain does not currently support the Voyage reranker,
  //        so we will either have to DIY from their library or wait
  //        for langchain.
  private reranker: null = null;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly config: RetrievalConfig,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  private getEmbeddingsModel(): Embeddings {
    if (this.embeddings) {
      return this.embeddings;
    }

    const strategy = this.config.strategy;

    switch (strategy.kind) {
      case "voyage-ai":
        this.embeddings = new VoyageEmbeddings({
          apiKey: strategy.voyageApiKey,
          modelName: strategy.embeddingModel,
          outputDimension: strategy.dimensions,
        });
        return this.embeddings;
      default:
        throw new Error(`Unsupported embedding strategy: ${strategy.kind}`);
    }
  }

  private getReranker(): null {
    // If we've already checked, return the cached result
    if (this.reranker !== undefined) {
      return this.reranker;
    }

    return null;
  }

  /**
   * Get the appropriate chunk size based on the model
   */
  private getChunkSize(): number {
    if (this.config.strategy.kind === "voyage-ai") {
      const modelName = this.config.strategy.embeddingModel;
      // Use 1000 character chunks for voyage-3, 650 for other Voyage models
      return modelName.includes("voyage-3") ? 1000 : 650;
    }

    // Default chunk size if we can't determine from the model
    return 650;
  }

  /**
   * Split text into chunks appropriate for the current embedding model
   */
  private async splitTextIntoChunks(text: string): Promise<string[]> {
    const chunkSize = this.getChunkSize();
    const chunkOverlap = Math.floor(chunkSize * 0.1); // 10% overlap

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    return splitter.splitText(text);
  }

  /**
   * Generate an embedding vector for the given text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.getEmbeddingsModel();

    try {
      const embeddings = await model.embedQuery(text);
      return embeddings;
    } catch (err) {
      this.logger.error({ error: err }, "Failed to generate embedding");
      throw new Error(`Failed to generate embedding, check the logs for more.`);
    }
  }

  /**
   * Create and store an embedding for a source object
   * If the text is long, it will be automatically chunked
   */
  async createEmbedding(
    input: CreateEmbeddingInput,
    executor: Drizzle = this.db,
  ): Promise<DBEmbedding[]> {
    const { sourceType, sourceId, textContent } = input;

    // Determine if we need to chunk the text
    const chunkSize = this.getChunkSize();
    const needsChunking = textContent.length > chunkSize;

    // Get the model name from the config
    const modelName =
      this.config.strategy.kind === "voyage-ai"
        ? this.config.strategy.embeddingModel
        : "unknown";

    if (!needsChunking) {
      // Simple case: just create a single embedding
      const embeddingVector = await this.generateEmbedding(textContent);

      const [embedding] = await executor
        .insert(EMBEDDINGS)
        .values({
          tenantId: this.tenantUuid,
          embedding: embeddingVector,
          sourceType,
          sourceId,
          textContent,
          chunkIndex: 0,
          isChunked: false,
          modelName,
        })
        .returning();

      if (!embedding) {
        throw new Error("Failed to create embedding");
      }

      this.logger.info(
        { sourceType, sourceId, isChunked: false },
        "Created single embedding",
      );

      return [embedding];
    } else {
      // Complex case: split text into chunks and create multiple embeddings
      const chunks = await this.splitTextIntoChunks(textContent);

      const embeddings: DBEmbedding[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        if (!chunk) {
          this.logger.warn(
            { chunk },
            "Skipping chunk creation due to empty content",
          );
          continue;
        }

        const embeddingVector = await this.generateEmbedding(chunk);

        const [embedding] = await executor
          .insert(EMBEDDINGS)
          .values({
            tenantId: this.tenantUuid,
            embedding: embeddingVector,
            sourceType,
            sourceId,
            textContent: chunk,
            chunkIndex: i,
            isChunked: true,
            modelName,
          })
          .returning();

        if (!embedding) {
          throw new Error(`Failed to create embedding for chunk ${i}`);
        }

        embeddings.push(embedding);
      }

      this.logger.info(
        { sourceType, sourceId, chunkCount: chunks.length, isChunked: true },
        "Created chunked embeddings",
      );

      return embeddings;
    }
  }

  /**
   * Delete embeddings for a specific source
   */
  async deleteEmbeddingsForSource(
    sourceType: EmbeddingSourceType,
    sourceId: StringUUID,
    executor: Drizzle = this.db,
  ): Promise<number> {
    const result = await executor
      .delete(EMBEDDINGS)
      .where(
        and(
          eq(EMBEDDINGS.tenantId, this.tenantUuid),
          eq(EMBEDDINGS.sourceType, sourceType),
          eq(EMBEDDINGS.sourceId, sourceId),
        ),
      );

    this.logger.info(
      { sourceType, sourceId, count: result.rowCount },
      "Deleted embeddings for source",
    );

    return result.rowCount ?? 0;
  }

  /**
   * Check if embeddings exist for a source
   */
  async hasEmbeddingsForSource(
    sourceType: EmbeddingSourceType,
    sourceId: StringUUID,
    executor: DrizzleRO = this.dbRO,
  ): Promise<boolean> {
    const [result] = await executor
      .select({ count: count().mapWith(Number) })
      .from(EMBEDDINGS)
      .where(
        and(
          eq(EMBEDDINGS.tenantId, this.tenantUuid),
          eq(EMBEDDINGS.sourceType, sourceType),
          eq(EMBEDDINGS.sourceId, sourceId),
        ),
      );

    if (!result) {
      throw new Error("Failed to check for embeddings; count did not return");
    }

    return (result.count ?? 0) > 0;
  }

  /**
   * Retrieve similar documents to the query
   */
  async retrieveSimilar({
    query,
    sourceTypes,
    limit = 10,
    minSimilarity = 0.7,
    skipReranking = false,
  }: {
    query: string;
    sourceTypes?: EmbeddingSourceType[];
    limit?: number;
    minSimilarity?: number;
    skipReranking?: boolean;
  }): Promise<RetrievalResult[]> {
    if (!query || query.trim() === "") {
      throw new Error("Query cannot be empty");
    }

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);

    // Determine if we should use reranking
    let reranker = null;
    if (!skipReranking) {
      reranker = this.getReranker();
    }

    // If we're using reranking, we need to fetch more results initially
    const initialLimit = reranker ? Math.min(limit * 3, 100) : limit;

    // Build the query conditions
    const conditions = [eq(EMBEDDINGS.tenantId, this.tenantUuid)];

    // Add source type filter if provided
    if (sourceTypes && sourceTypes.length > 0) {
      conditions.push(inArray(EMBEDDINGS.sourceType, sourceTypes));
    }

    // Execute the vector similarity search
    const rawResults = await this.dbRO
      .select({
        embeddingId: EMBEDDINGS.embeddingId,
        sourceType: EMBEDDINGS.sourceType,
        sourceId: EMBEDDINGS.sourceId,
        textContent: EMBEDDINGS.textContent,
        isChunked: EMBEDDINGS.isChunked,
        chunkIndex: EMBEDDINGS.chunkIndex,
        // Calculate cosine similarity
        similarity:
          sql`1 - (${EMBEDDINGS.embedding} <=> ${queryEmbedding})`.mapWith(
            Number,
          ),
      })
      .from(EMBEDDINGS)
      .where(and(...conditions))
      .orderBy(sql`${EMBEDDINGS.embedding} <=> ${queryEmbedding}`)
      .limit(initialLimit);

    // Filter by minimum similarity
    const results = rawResults.filter((r) => r.similarity >= minSimilarity);

    this.logger.debug(
      {
        query,
        resultCount: results.length,
        useReranking: !!reranker,
        initialLimit,
        finalLimit: limit,
      },
      "Retrieved initial results",
    );

    let finalResult: typeof results | null = null;

    // Apply reranking if available and not skipped
    // TODO:  implement reranking
    if (reranker && results.length > 0) {
      try {
        throw new Error("Reranking is not implemented.");
      } catch (error) {
        this.logger.error(
          { error },
          "Reranking failed, falling back to vector similarity",
        );
        finalResult = null;
      }
    }

    finalResult =
      finalResult ??
      results.map((r) => ({
        embeddingId: r.embeddingId,
        sourceType: r.sourceType as EmbeddingSourceType,
        sourceId: r.sourceId,
        textContent: r.textContent,
        similarity: r.similarity,
        isChunked: r.isChunked,
        chunkIndex: r.chunkIndex,
      }));

    // Limit to the requested number of results
    return finalResult.slice(0, limit);
  }
}
