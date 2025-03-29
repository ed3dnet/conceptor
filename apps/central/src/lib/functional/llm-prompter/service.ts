import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { eq, and } from "drizzle-orm";
import type { Logger } from "pino";

import { LLM_CONVERSATIONS } from "../../../_db/schema/index.js";
import { type TenantId, TenantIds } from "../../../domain/tenants/id.js";
import type { Drizzle } from "../../datastores/postgres/types.js";
import { type StringUUID } from "../../ext/typebox/index.js";
import type { VaultService } from "../vault/service.js";

import type { LlmModelConnectorName, LlmPrompterConfig } from "./config.js";
import { Conversation } from "./conversation.js";
import { ConversationIds, type ConversationId } from "./id.js";

export class LlmPrompterService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly config: LlmPrompterConfig,
    private readonly db: Drizzle,
    private readonly vault: VaultService,
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
      default:
        // eslint-disable-next-line no-case-declarations
        const exhaustiveCheck: never = modelConfig.strategy;
        throw new Error(
          `Unknown model strategy for '${name}': ${modelConfig.strategy}`,
        );
    }
  }

  async immediateQuery(connectorName: LlmModelConnectorName, prompt: string) {
    const model = this.getModel(connectorName);
    return model.invoke([{ role: "user", content: prompt }]);
  }

  async createConversation(
    connectorName: LlmModelConnectorName,
    purpose?: string,
  ) {
    const model = this.getModel(connectorName);
    return Conversation.create({
      tenantId: this.tenantId,
      model,
      connectorName,
      db: this.db,
      vault: this.vault,
      purpose,
    });
  }

  async getConversation(conversationId: ConversationId) {
    const conversation = await Conversation.load({
      conversationId,
      tenantId: this.tenantId,
      db: this.db,
      vault: this.vault,
      getModel: (name: LlmModelConnectorName) => this.getModel(name),
    });

    // Verify the conversation belongs to this tenant
    const conversationUuid = ConversationIds.toUUID(conversationId);
    const [conversationRecord] = await this.db
      .select()
      .from(LLM_CONVERSATIONS)
      .where(
        and(
          eq(LLM_CONVERSATIONS.conversationId, conversationUuid),
          eq(LLM_CONVERSATIONS.tenantId, this.tenantUuid),
        ),
      )
      .limit(1);

    if (!conversationRecord) {
      throw new Error(`Conversation not found for tenant: ${conversationId}`);
    }

    return conversation;
  }
}
