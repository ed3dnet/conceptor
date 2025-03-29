import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { MessageContent } from "@langchain/core/messages";
import { eq } from "drizzle-orm";

import type { DBLLMConversationMessage } from "../../../_db/models.js";
import {
  LLM_CONVERSATIONS,
  LLM_CONVERSATION_MESSAGES,
} from "../../../_db/schema/index.js";
import { type TenantId, TenantIds } from "../../../domain/tenants/id.js";
import type { Drizzle } from "../../datastores/postgres/types.js";
import { type StringUUID } from "../../ext/typebox/index.js";
import type { VaultService } from "../vault/service.js";

import { type LlmModelConnectorName } from "./config.js";
import { ConversationIds, type ConversationId } from "./id.js";

export class Conversation {
  private readonly conversationUuid: StringUUID;
  private readonly tenantUuid: StringUUID;

  private messages: DBLLMConversationMessage[] = [];

  async sendMessage(content: string) {
    await this.addMessage("human", content);

    const messages = await this.getDecryptedMessages();
    const response = await this.model.invoke(
      messages.map((m) => ({
        role: m.message.role,
        content: m.content,
      })),
    );

    return this.addMessage("assistant", response.content);
  }

  async addSystemMessage(content: string): Promise<DBLLMConversationMessage> {
    return this.addMessage("system", content);
  }

  async getDecryptedMessages() {
    return Promise.all(
      this.messages.map(async (message) => ({
        message,
        content: await this.vault.decrypt(message.content),
      })),
    );
  }

  private async addMessage(
    role: "system" | "human" | "assistant",
    content: MessageContent,
  ): Promise<DBLLMConversationMessage> {
    const orderIndex = this.messages.length;

    const [message] = await this.db
      .insert(LLM_CONVERSATION_MESSAGES)
      .values({
        conversationId: this.conversationUuid,
        role,
        content: await this.vault.encrypt(content),
        orderIndex,
      })
      .returning();

    if (!message) {
      throw new Error("Failed to add message");
    }

    this.messages.push(message);
    return message;
  }

  private constructor(
    conversationId: ConversationId,
    tenantId: TenantId,
    private readonly model: BaseChatModel,
    private readonly db: Drizzle,
    private readonly vault: VaultService,
  ) {
    this.conversationUuid = ConversationIds.toUUID(conversationId);
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  static async create({
    tenantId,
    model,
    connectorName,
    db,
    vault,
    purpose,
  }: {
    tenantId: TenantId;
    model: BaseChatModel;
    connectorName: LlmModelConnectorName;
    db: Drizzle;
    vault: VaultService;
    purpose?: string;
  }) {
    const tenantUuid = TenantIds.toUUID(tenantId);
    const [conversation] = await db
      .insert(LLM_CONVERSATIONS)
      .values({
        tenantId: tenantUuid,
        connectorName,
        modelOptions: model.invocationParams(),
        purpose,
      })
      .returning();

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    return new Conversation(
      ConversationIds.toRichId(conversation.conversationId),
      TenantIds.toRichId(tenantId),
      model,
      db,
      vault,
    );
  }

  static async load({
    conversationId,
    tenantId,
    db,
    vault,
    getModel,
  }: {
    conversationId: ConversationId;
    tenantId: TenantId;
    db: Drizzle;
    vault: VaultService;
    getModel: (name: LlmModelConnectorName) => BaseChatModel;
  }) {
    const conversationUuid = ConversationIds.toUUID(conversationId);
    const [conversation] = await db
      .select()
      .from(LLM_CONVERSATIONS)
      .where(eq(LLM_CONVERSATIONS.conversationId, conversationUuid))
      .limit(1);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const model = getModel(conversation.connectorName);
    const instance = new Conversation(
      conversationId,
      tenantId,
      model,
      db,
      vault,
    );

    instance.messages = await db
      .select()
      .from(LLM_CONVERSATION_MESSAGES)
      .where(eq(LLM_CONVERSATION_MESSAGES.conversationId, conversationUuid))
      .orderBy(LLM_CONVERSATION_MESSAGES.orderIndex);

    return instance;
  }
}
