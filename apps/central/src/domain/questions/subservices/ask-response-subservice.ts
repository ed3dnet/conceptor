import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { eq, and, desc, count } from "drizzle-orm";
import { type Logger } from "pino";

import { ANSWERS, ASK_RESPONSES, ASKS } from "../../../_db/schema/index.js";
import {
  decodeCursor,
  encodeCursor,
} from "../../../domain/shared/schemas/lists.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../../lib/ext/typebox/index.js";
import { type EventService } from "../../events/service.js";
import { AnswerIds, type AnswerId } from "../../insights/schemas/id.js";
import { TenantIds, type TenantId } from "../../tenants/id.js";
import { UserIds, type UserId } from "../../users/id.js";
import { AskIds, AskResponseIds, type AskId } from "../schemas/id.js";
import {
  type AskResponsePublic,
  type CreateAskResponseInput,
  type ListAskResponsesInput,
  type ListAskResponsesInputOrCursor,
  type ListAskResponsesResponse,
  ListAskResponsesInputChecker,
} from "../schemas/index.js";

/**
 * AskResponseSubservice handles operations related to AskResponses and Answers
 */
export class AskResponseSubservice {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.logger.debug("AskResponseSubservice initialized");
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  /**
   * Creates a new AskResponse with its associated Answer
   */
  async createAskResponse(
    askId: AskId,
    userId: UserId,
    input: CreateAskResponseInput,
    executor: Drizzle = this.db,
  ): Promise<AskResponsePublic> {
    this.logger.debug({ askId, userId, input }, "Creating new AskResponse");

    // Verify the Ask exists and belongs to this tenant
    const [ask] = await executor
      .select()
      .from(ASKS)
      .where(
        and(
          eq(ASKS.askId, AskIds.toUUID(askId)),
          eq(ASKS.tenantId, this.tenantUuid),
        ),
      )
      .limit(1);

    if (!ask) {
      throw new NotFoundError(`Ask with ID ${askId} not found`);
    }

    // Create the AskResponse
    const now = new Date();
    const [dbAskResponse] = await executor
      .insert(ASK_RESPONSES)
      .values({
        tenantId: this.tenantUuid,
        askId: AskIds.toUUID(askId),
        userId: UserIds.toUUID(userId),
        response: input.response,
        createdAt: now,
      })
      .returning();

    if (!dbAskResponse) {
      throw new Error("Failed to create AskResponse");
    }

    // Dispatch event (which will start Insights into answer extraction)
    await this.events.dispatchEvent({
      __type: "AskResponseCreated",
      tenantId: this.tenantId,
      askId: askId,
      askResponseId: AskIds.toRichId(dbAskResponse.askResponseId),
      userId: userId,
      timestamp: now.toISOString(),
    });

    // Return the public AskResponse
    return {
      __type: "AskResponsePublic",
      askResponseId: AskResponseIds.toRichId(dbAskResponse.askResponseId),
      askId: askId,
      tenantId: this.tenantId,
      userId: userId,
      response: dbAskResponse.response,
      createdAt: dbAskResponse.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves an AskResponse by its ID
   */
  async getAskResponseById(
    askResponseId: AskId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<AskResponsePublic | null> {
    this.logger.debug({ askResponseId }, "Getting AskResponse by ID");

    const [dbAskResponse] = await executor
      .select()
      .from(ASK_RESPONSES)
      .where(
        and(
          eq(ASK_RESPONSES.askResponseId, AskIds.toUUID(askResponseId)),
          eq(ASK_RESPONSES.tenantId, this.tenantUuid),
        ),
      )
      .limit(1);

    if (!dbAskResponse) {
      return null;
    }

    // Check if there's an associated Answer
    const [dbAnswer] = await executor
      .select()
      .from(ANSWERS)
      .where(eq(ANSWERS.askResponseId, dbAskResponse.askResponseId))
      .limit(1);

    return {
      __type: "AskResponsePublic",
      askResponseId: AskResponseIds.toRichId(dbAskResponse.askResponseId),
      askId: AskIds.toRichId(dbAskResponse.askId),
      tenantId: TenantIds.toRichId(dbAskResponse.tenantId),
      userId: UserIds.toRichId(dbAskResponse.userId),
      response: dbAskResponse.response,
      createdAt: dbAskResponse.createdAt.toISOString(),
    };
  }

  /**
   * Helper method that throws NotFoundError if AskResponse doesn't exist
   */
  async withAskResponseById<T>(
    askResponseId: AskId,
    fn: (askResponse: AskResponsePublic) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const askResponse = await this.getAskResponseById(askResponseId, executor);
    if (!askResponse) {
      throw new NotFoundError(`AskResponse with ID ${askResponseId} not found`);
    }
    return fn(askResponse);
  }

  /**
   * Lists AskResponses for a specific Ask with pagination
   */
  async listAskResponses(
    askId: AskId,
    input: ListAskResponsesInputOrCursor,
    executor: DrizzleRO = this.dbRO,
  ): Promise<ListAskResponsesResponse> {
    this.logger.debug({ askId, input }, "Listing AskResponses");

    // Verify the Ask exists and belongs to this tenant
    const [ask] = await executor
      .select()
      .from(ASKS)
      .where(
        and(
          eq(ASKS.askId, AskIds.toUUID(askId)),
          eq(ASKS.tenantId, this.tenantUuid),
        ),
      )
      .limit(1);

    if (!ask) {
      throw new NotFoundError(`Ask with ID ${askId} not found`);
    }

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

    // Build query conditions
    const conditions = [
      eq(ASK_RESPONSES.askId, AskIds.toUUID(askId)),
      eq(ASK_RESPONSES.tenantId, this.tenantUuid),
    ];

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
      .select({
        askResponse: ASK_RESPONSES,
        answer: ANSWERS,
      })
      .from(ASK_RESPONSES)
      .leftJoin(ANSWERS, eq(ASK_RESPONSES.askResponseId, ANSWERS.askResponseId))
      .where(and(...conditions))
      .orderBy(desc(ASK_RESPONSES.createdAt))
      .limit(listInput.limit)
      .offset(listInput.offset);

    // Map to public DTOs
    const askResponseItems = items.map(
      (item): AskResponsePublic => ({
        __type: "AskResponsePublic",
        askResponseId: AskResponseIds.toRichId(item.askResponse.askResponseId),
        askId: AskIds.toRichId(item.askResponse.askId),
        tenantId: TenantIds.toRichId(item.askResponse.tenantId),
        userId: UserIds.toRichId(item.askResponse.userId),
        response: item.askResponse.response,
        createdAt: item.askResponse.createdAt.toISOString(),
      }),
    );

    // Generate next cursor if there are more results
    let cursor: string | null = null;
    if (
      askResponseItems.length > 0 &&
      listInput.offset + askResponseItems.length < total.count
    ) {
      cursor = encodeCursor(
        listInput,
        listInput.offset + askResponseItems.length,
        onlyBefore,
      );
    }

    return {
      items: askResponseItems,
      total: total.count,
      cursor,
    };
  }
}
