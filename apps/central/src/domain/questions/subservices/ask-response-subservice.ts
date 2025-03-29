import {
  NotFoundError,
  ConflictError,
} from "@myapp/shared-universal/errors/index.js";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { type Logger } from "pino";

import { ASK_RESPONSES, ASKS } from "../../../_db/schema/index.js";
import {
  decodeCursor,
  encodeCursor,
} from "../../../domain/shared/schemas/lists.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../../lib/datastores/postgres/types.js";
import { type EventService } from "../../events/service.js";
import { TenantIds, type TenantId } from "../../tenants/id.js";
import { UserIds, type UserId } from "../../users/id.js";
import {
  AskIds,
  AskResponseIds,
  type AskId,
  type AskResponseId,
} from "../schemas/id.js";
import {
  type AskResponsePublic,
  type CreateAskResponseInput,
  type ListAskResponsesInput,
  type ListAskResponsesInputOrCursor,
  type ListAskResponsesResponse,
  type AskResponseListItem,
  ListAskResponsesInputChecker,
} from "../schemas/index.js";

/**
 * AskResponseSubservice handles operations related to AskResponses
 */
export class AskResponseSubservice {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.logger.debug("AskResponseSubservice initialized");
  }

  /**
   * Creates a new AskResponse
   */
  async createAskResponse(
    tenantId: TenantId,
    userId: UserId,
    input: CreateAskResponseInput,
    executor: Drizzle = this.db,
  ): Promise<AskResponsePublic> {
    this.logger.debug({ tenantId, userId, input }, "Creating new AskResponse");

    const tenantUuid = TenantIds.toUUID(tenantId);
    const userUuid = UserIds.toUUID(userId);
    const askUuid = AskIds.toUUID(input.askId);
    const now = new Date();

    // Verify the ask exists and belongs to this tenant
    const [ask] = await executor
      .select()
      .from(ASKS)
      .where(and(eq(ASKS.askId, askUuid), eq(ASKS.tenantId, tenantUuid)))
      .limit(1);

    if (!ask) {
      throw new NotFoundError(`Ask with ID ${input.askId} not found`);
    }

    // Check if this user has already answered this ask
    if (ask.multipleAnswerStrategy === "disallow") {
      const existingResponses = await executor
        .select({ count: count().mapWith(Number) })
        .from(ASK_RESPONSES)
        .where(
          and(
            eq(ASK_RESPONSES.askId, askUuid),
            eq(ASK_RESPONSES.userId, userUuid),
          ),
        );

      if (existingResponses[0] && existingResponses[0].count > 0) {
        throw new ConflictError(
          `User has already answered this ask and multiple answers are not allowed`,
        );
      }
    }

    // Find previous response if this is a re-answer
    let previousAskResponseId: AskResponseId | undefined;
    if (ask.multipleAnswerStrategy === "remember-last") {
      const [previousResponse] = await executor
        .select()
        .from(ASK_RESPONSES)
        .where(
          and(
            eq(ASK_RESPONSES.askId, askUuid),
            eq(ASK_RESPONSES.userId, userUuid),
          ),
        )
        .orderBy(desc(ASK_RESPONSES.createdAt))
        .limit(1);

      if (previousResponse) {
        previousAskResponseId = AskResponseIds.toRichId(
          previousResponse.askResponseId,
        );
      }
    }

    // Create the AskResponse
    const [dbAskResponse] = await executor
      .insert(ASK_RESPONSES)
      .values({
        tenantId: tenantUuid,
        askId: askUuid,
        userId: userUuid,
        response: input.response,
        createdAt: now,
      })
      .returning();

    if (!dbAskResponse) {
      throw new Error("Failed to create AskResponse");
    }

    const askResponseId = AskResponseIds.toRichId(dbAskResponse.askResponseId);

    // Dispatch appropriate event
    if (previousAskResponseId) {
      await this.events.dispatchEvent({
        __type: "AskResponseReanswered",
        tenantId,
        askId: input.askId,
        askResponseId,
        userId,
        previousAskResponseId,
        timestamp: now.toISOString(),
      });
    } else {
      await this.events.dispatchEvent({
        __type: "AskResponseCreated",
        tenantId,
        askId: input.askId,
        askResponseId,
        userId,
        timestamp: now.toISOString(),
      });
    }

    // TODO: If ask.notifySourceAgent is true, ping the agent that created the ask

    // Return the public AskResponse
    return {
      __type: "AskResponsePublic",
      askResponseId,
      askId: input.askId,
      userId,
      response: dbAskResponse.response,
      createdAt: dbAskResponse.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves an AskResponse by its ID
   */
  async getAskResponseById(
    tenantId: TenantId,
    askResponseId: AskResponseId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<AskResponsePublic | null> {
    this.logger.debug({ tenantId, askResponseId }, "Getting AskResponse by ID");

    const tenantUuid = TenantIds.toUUID(tenantId);
    const askResponseUuid = AskResponseIds.toUUID(askResponseId);

    const [dbAskResponse] = await executor
      .select()
      .from(ASK_RESPONSES)
      .where(
        and(
          eq(ASK_RESPONSES.askResponseId, askResponseUuid),
          eq(ASK_RESPONSES.tenantId, tenantUuid),
        ),
      )
      .limit(1);

    if (!dbAskResponse) {
      return null;
    }

    return {
      __type: "AskResponsePublic",
      askResponseId: AskResponseIds.toRichId(dbAskResponse.askResponseId),
      askId: AskIds.toRichId(dbAskResponse.askId),
      userId: UserIds.toRichId(dbAskResponse.userId),
      response: dbAskResponse.response,
      createdAt: dbAskResponse.createdAt.toISOString(),
    };
  }

  /**
   * Helper method that throws NotFoundError if AskResponse doesn't exist
   */
  async withAskResponseById<T>(
    tenantId: TenantId,
    askResponseId: AskResponseId,
    fn: (askResponse: AskResponsePublic) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const askResponse = await this.getAskResponseById(
      tenantId,
      askResponseId,
      executor,
    );
    if (!askResponse) {
      throw new NotFoundError(`AskResponse with ID ${askResponseId} not found`);
    }
    return fn(askResponse);
  }

  /**
   * Lists AskResponses for a specific Ask with pagination
   */
  async listAskResponses(
    tenantId: TenantId,
    input: ListAskResponsesInputOrCursor,
    executor: DrizzleRO = this.dbRO,
  ): Promise<ListAskResponsesResponse> {
    this.logger.debug({ tenantId, input }, "Listing AskResponses");

    const tenantUuid = TenantIds.toUUID(tenantId);
    let listInput: ListAskResponsesInput;
    let onlyBefore: Date | undefined;

    // Handle cursor-based pagination
    if ("cursor" in input) {
      const decoded = decodeCursor(input.cursor, ListAskResponsesInputChecker);
      listInput = decoded.original;
      onlyBefore = decoded.onlyBefore;
    } else {
      listInput = input;
      onlyBefore = new Date();
    }

    const askUuid = AskIds.toUUID(listInput.askId);

    // Build query conditions
    const conditions = [
      eq(ASK_RESPONSES.tenantId, tenantUuid),
      eq(ASK_RESPONSES.askId, askUuid),
    ];

    if (onlyBefore) {
      conditions.push(sql`${ASK_RESPONSES.createdAt} <= ${onlyBefore}`);
    }

    // Count total matching items
    const [total] = await executor
      .select({ count: count().mapWith(Number) })
      .from(ASK_RESPONSES)
      .where(and(...conditions));

    if (!total) {
      throw new Error("Failed when counting ask responses");
    }

    // Get paginated results
    const items = await executor
      .select()
      .from(ASK_RESPONSES)
      .where(and(...conditions))
      .orderBy(desc(ASK_RESPONSES.createdAt))
      .limit(listInput.limit)
      .offset(listInput.offset);

    // Map to public DTOs
    const askResponseListItems: AskResponseListItem[] = items.map((item) => ({
      __type: "AskResponseListItem",
      askResponseId: AskResponseIds.toRichId(item.askResponseId),
      askId: AskIds.toRichId(item.askId),
      userId: UserIds.toRichId(item.userId),
      createdAt: item.createdAt.toISOString(),
    }));

    // Generate next cursor if there are more results
    let cursor: string | null = null;
    if (
      askResponseListItems.length > 0 &&
      listInput.offset + askResponseListItems.length < total.count
    ) {
      cursor = encodeCursor(
        listInput,
        listInput.offset + askResponseListItems.length,
        onlyBefore,
      );
    }

    return {
      items: askResponseListItems,
      total: total.count,
      cursor,
    };
  }

  /**
   * Gets the latest AskResponse for a specific Ask and User
   */
  async getLatestAskResponseForUser(
    tenantId: TenantId,
    askId: AskId,
    userId: UserId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<AskResponsePublic | null> {
    this.logger.debug(
      { tenantId, askId, userId },
      "Getting latest AskResponse for user",
    );

    const tenantUuid = TenantIds.toUUID(tenantId);
    const askUuid = AskIds.toUUID(askId);
    const userUuid = UserIds.toUUID(userId);

    const [dbAskResponse] = await executor
      .select()
      .from(ASK_RESPONSES)
      .where(
        and(
          eq(ASK_RESPONSES.tenantId, tenantUuid),
          eq(ASK_RESPONSES.askId, askUuid),
          eq(ASK_RESPONSES.userId, userUuid),
        ),
      )
      .orderBy(desc(ASK_RESPONSES.createdAt))
      .limit(1);

    if (!dbAskResponse) {
      return null;
    }

    return {
      __type: "AskResponsePublic",
      askResponseId: AskResponseIds.toRichId(dbAskResponse.askResponseId),
      askId: AskIds.toRichId(dbAskResponse.askId),
      userId: UserIds.toRichId(dbAskResponse.userId),
      response: dbAskResponse.response,
      createdAt: dbAskResponse.createdAt.toISOString(),
    };
  }
}
