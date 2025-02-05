import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Logger } from "pino";

import type { Drizzle } from "../../lib/datastores/postgres/types.server.js";
import type { VaultService } from "../vault/service.js";

import type { LlmModelConnectorName, LlmPrompterConfig } from "./config.js";
import { Conversation } from "./conversation.js";

export class LlmPrompterService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly config: LlmPrompterConfig,
    private readonly db: Drizzle,
    private readonly vault: VaultService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
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
      default:
        throw new Error(`Unknown model strategy: ${modelConfig.strategy.kind}`);
    }
  }

  async immediateQuery(connectorName: LlmModelConnectorName, prompt: string) {
    const model = this.getModel(connectorName);
    return model.invoke([{ role: "user", content: prompt }]);
  }

  async createConversation(
    tenantId: string,
    connectorName: LlmModelConnectorName,
    purpose?: string,
  ) {
    const model = this.getModel(connectorName);
    return Conversation.create({
      tenantId,
      model,
      connectorName,
      db: this.db,
      vault: this.vault,
      purpose,
    });
  }

  async getConversation(conversationId: string) {
    return Conversation.load({
      conversationId,
      db: this.db,
      vault: this.vault,
      getModel: (name: LlmModelConnectorName) => this.getModel(name),
    });
  }
}
