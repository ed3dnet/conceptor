import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatVertexAI } from "@langchain/google-vertexai";
import type { Logger } from "pino";

import { type TenantId, TenantIds } from "../../../domain/tenants/id.js";
import { type StringUUID } from "../../ext/typebox/index.js";

import type { LlmModelConnectorName, LlmPrompterConfig } from "./config.js";

export class LlmPrompterService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly config: LlmPrompterConfig,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  private getModel(name: LlmModelConnectorName): BaseChatModel {
    const modelConfig = this.config.modelConnectors[name];
    if (!modelConfig) {
      throw new Error(`Unknown model config: ${name}`);
    }

    switch (modelConfig.strategy.kind) {
      case "claude-anthropic":
        return new ChatAnthropic({
          modelName: modelConfig.strategy.model,
          anthropicApiKey: modelConfig.strategy.anthropicApiKey,
          temperature: modelConfig.strategy.temperature,
          maxTokens: modelConfig.strategy.maxTokens,
        });
      case "google-genai":
        return new ChatGoogleGenerativeAI({
          modelName: modelConfig.strategy.model,
          apiKey: modelConfig.strategy.googleApiKey,
          temperature: modelConfig.strategy.temperature,
          maxOutputTokens: modelConfig.strategy.maxOutputTokens,
        });
      // TODO: test vertex AI for this
      case "google-vertexai":
        return new ChatVertexAI({
          modelName: modelConfig.strategy.model,
          temperature: modelConfig.strategy.temperature,
          maxOutputTokens: modelConfig.strategy.maxOutputTokens,
          location: modelConfig.strategy.googleLocation,
          ...(modelConfig.strategy.credentialsJson
            ? {
                authOptions: {
                  credentials: JSON.parse(modelConfig.strategy.credentialsJson),
                },
              }
            : {}),
        });
      default:
        // eslint-disable-next-line no-case-declarations
        const exhaustiveCheck: never = modelConfig.strategy;
        throw new Error(
          `Unknown model strategy for '${name}': ${modelConfig.strategy}`,
        );
    }
  }

  async immediateQuery(
    connectorName: LlmModelConnectorName,
    data: { systemPrompt?: string; userPrompt: string },
  ) {
    const model = this.getModel(connectorName);
    const prompt = [
      ...(data.systemPrompt
        ? [{ role: "system", content: data.systemPrompt }]
        : []),
      { role: "user", content: data.userPrompt },
    ].filter(Boolean);
    return model.invoke(prompt);
  }
}
