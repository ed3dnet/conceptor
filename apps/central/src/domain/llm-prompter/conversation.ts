import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { MessageContent } from "@langchain/core/messages";
import { eq } from "drizzle-orm";

import type { DBLLMConversationMessage } from "../../_db/models.js";
import {
  LLM_CONVERSATIONS,
  LLM_CONVERSATION_MESSAGES,
} from "../../_db/schema/index.js";
import type { Drizzle } from "../../lib/datastores/postgres/types.server.js";
import type { VaultService } from "../vault/service.js";

import { type LlmModelConnectorName } from "./config.js";

export class Conversation {
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
        conversationId: this.conversationId,
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
    readonly conversationId: string,
    private readonly model: BaseChatModel,
    private readonly db: Drizzle,
    private readonly vault: VaultService,
  ) {}

  static async create({
    tenantId,
    model,
    connectorName,
    db,
    vault,
    purpose,
  }: {
    tenantId: string;
    model: BaseChatModel;
    connectorName: LlmModelConnectorName;
    db: Drizzle;
    vault: VaultService;
    purpose?: string;
  }) {
    const [conversation] = await db
      .insert(LLM_CONVERSATIONS)
      .values({
        tenantId,
        connectorName,
        modelOptions: model.invocationParams(),
        purpose,
      })
      .returning();

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    return new Conversation(conversation.conversationId, model, db, vault);
  }

  static async load({
    conversationId,
    db,
    vault,
    getModel,
  }: {
    conversationId: string;
    db: Drizzle;
    vault: VaultService;
    getModel: (name: LlmModelConnectorName) => BaseChatModel;
  }) {
    const [conversation] = await db
      .select()
      .from(LLM_CONVERSATIONS)
      .where(eq(LLM_CONVERSATIONS.conversationId, conversationId))
      .limit(1);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const model = getModel(conversation.connectorName);
    const instance = new Conversation(conversationId, model, db, vault);

    instance.messages = await db
      .select()
      .from(LLM_CONVERSATION_MESSAGES)
      .where(eq(LLM_CONVERSATION_MESSAGES.conversationId, conversationId))
      .orderBy(LLM_CONVERSATION_MESSAGES.orderIndex);

    return instance;
  }
}
