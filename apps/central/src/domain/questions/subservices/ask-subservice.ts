import {
  NotFoundError,
  ConflictError,
} from "@myapp/shared-universal/errors/index.js";
import { eq, and, inArray, desc, sql, count } from "drizzle-orm";
import { type Logger } from "pino";

import { ASKS, ASK_REFERENCES } from "../../../_db/schema/index.js";
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
import { AnswerIds } from "../../insights/schemas/id.js";
import { TenantIds, type TenantId } from "../../tenants/id.js";
import { UnitIds } from "../../units/id.js";
import { AskIds, AskReferenceIds, type AskId } from "../schemas/id.js";
import {
  type AskPublic,
  type CreateAskInput,
  type ListAsksInput,
  type ListAsksInputOrCursor,
  type ListAsksResponse,
  type AskListItem,
  type AskReferencePublic,
  ListAsksInputChecker,
} from "../schemas/index.js";

/**
 * AskSubservice handles operations related to Asks and AskReferences
 */
export class AskSubservice {
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
    this.logger.debug("AskSubservice initialized");
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  /**
   * Creates a new Ask with its associated references
   */
  async createAsk(
    input: CreateAskInput,
    executor: Drizzle = this.db,
  ): Promise<AskPublic> {
    this.logger.debug({ input }, "Creating new Ask");

    // Validate that we have at least one subject and one object reference
    const subjectRefs = input.references.filter(
      (ref) => ref.referenceDirection === "subject",
    );
    const objectRefs = input.references.filter(
      (ref) => ref.referenceDirection === "object",
    );

    if (subjectRefs.length === 0) {
      throw new ConflictError("At least one subject reference is required");
    }

    if (objectRefs.length === 0) {
      throw new ConflictError("At least one object reference is required");
    }

    // Validate that each reference has exactly one target entity
    for (const ref of input.references) {
      const targetCount = [
        ref.unitId,
        // ref.initiativeId, // Commented out as not implemented yet
        // ref.capabilityId, // Commented out as not implemented yet
        ref.answerId,
      ].filter(Boolean).length;

      if (targetCount !== 1) {
        throw new ConflictError(
          "Each reference must have exactly one target entity",
        );
      }
    }

    // Create the Ask
    const now = new Date();

    const [dbAsk] = await executor
      .insert(ASKS)
      .values({
        tenantId: this.tenantUuid,
        hardcodeKind: input.hardcodeKind,
        sourceAgentName: input.sourceAgentName,
        notifySourceAgent: input.notifySourceAgent,
        query: input.query,
        visibility: input.visibility,
        multipleAnswerStrategy: input.multipleAnswerStrategy,
        createdAt: now,
      })
      .returning();

    if (!dbAsk) {
      throw new Error("Failed to create Ask");
    }

    const askId = AskIds.toRichId(dbAsk.askId);

    // Create the references
    const askReferences: AskReferencePublic[] = [];

    for (const ref of input.references) {
      const [dbAskRef] = await executor
        .insert(ASK_REFERENCES)
        .values({
          askId: dbAsk.askId,
          referenceDirection: ref.referenceDirection,
          unitId: ref.unitId ? UnitIds.toUUID(ref.unitId) : null,
          // initiativeId: ref.initiativeId ? InitiativeIds.toUUID(ref.initiativeId) : null,
          // capabilityId: ref.capabilityId ? CapabilityIds.toUUID(ref.capabilityId) : null,
          answerId: ref.answerId ? AnswerIds.toUUID(ref.answerId) : null,
          createdAt: now,
        })
        .returning();

      if (!dbAskRef) {
        throw new Error("Failed to create Ask reference");
      }

      askReferences.push({
        __type: "AskReferencePublic",
        askReferenceId: AskReferenceIds.toRichId(dbAskRef.askReferenceId),
        askId: AskIds.toRichId(dbAskRef.askId),
        referenceDirection: dbAskRef.referenceDirection,
        unitId: dbAskRef.unitId ? UnitIds.toRichId(dbAskRef.unitId) : undefined,
        // initiativeId: dbAskRef.initiativeId ? InitiativeIds.toRichId(dbAskRef.initiativeId) : undefined,
        // capabilityId: dbAskRef.capabilityId ? CapabilityIds.toRichId(dbAskRef.capabilityId) : undefined,
        answerId: dbAskRef.answerId
          ? AnswerIds.toRichId(dbAskRef.answerId)
          : undefined,
        createdAt: dbAskRef.createdAt.toISOString(),
      });
    }

    // Dispatch event
    await this.events.dispatchEvent({
      __type: "AskCreated",
      tenantId: this.tenantId,
      askId: askId,
      hardcodeKind: input.hardcodeKind,
      sourceAgentName: input.sourceAgentName,
      timestamp: now.toISOString(),
    });

    // Return the public Ask
    return {
      __type: "AskPublic",
      askId,
      tenantId: this.tenantId,
      hardcodeKind: dbAsk.hardcodeKind || undefined,
      sourceAgentName: dbAsk.sourceAgentName || undefined,
      query: dbAsk.query,
      visibility: dbAsk.visibility,
      multipleAnswerStrategy: dbAsk.multipleAnswerStrategy,
      createdAt: dbAsk.createdAt.toISOString(),
      references: askReferences,
    };
  }

  /**
   * Retrieves an Ask by its ID
   */
  async getAskById(
    askId: AskId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<AskPublic | null> {
    this.logger.debug({ askId }, "Getting Ask by ID");

    const askUuid = AskIds.toUUID(askId);

    const [dbAsk] = await executor
      .select()
      .from(ASKS)
      .where(and(eq(ASKS.askId, askUuid), eq(ASKS.tenantId, this.tenantUuid)))
      .limit(1);

    if (!dbAsk) {
      return null;
    }

    // Get references
    const dbAskRefs = await executor
      .select()
      .from(ASK_REFERENCES)
      .where(eq(ASK_REFERENCES.askId, askUuid));

    const askReferences: AskReferencePublic[] = dbAskRefs.map((ref) => ({
      __type: "AskReferencePublic",
      askReferenceId: AskReferenceIds.toRichId(ref.askReferenceId),
      askId: AskIds.toRichId(ref.askId),
      referenceDirection: ref.referenceDirection,
      unitId: ref.unitId ? UnitIds.toRichId(ref.unitId) : undefined,
      // initiativeId: ref.initiativeId ? InitiativeIds.toRichId(ref.initiativeId) : undefined,
      // capabilityId: ref.capabilityId ? CapabilityIds.toRichId(ref.capabilityId) : undefined,
      answerId: ref.answerId ? AnswerIds.toRichId(ref.answerId) : undefined,
      createdAt: ref.createdAt.toISOString(),
    }));

    return {
      __type: "AskPublic",
      askId: AskIds.toRichId(dbAsk.askId),
      tenantId: TenantIds.toRichId(dbAsk.tenantId),
      hardcodeKind: dbAsk.hardcodeKind || undefined,
      sourceAgentName: dbAsk.sourceAgentName || undefined,
      query: dbAsk.query,
      visibility: dbAsk.visibility,
      multipleAnswerStrategy: dbAsk.multipleAnswerStrategy,
      createdAt: dbAsk.createdAt.toISOString(),
      references: askReferences,
    };
  }

  /**
   * Helper method that throws NotFoundError if Ask doesn't exist
   */
  async withAskById<T>(
    askId: AskId,
    fn: (ask: AskPublic) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const ask = await this.getAskById(askId, executor);
    if (!ask) {
      throw new NotFoundError(`Ask with ID ${askId} not found`);
    }
    return fn(ask);
  }

  /**
   * Lists Asks with filtering and pagination
   */
  async listAsks(
    input: ListAsksInputOrCursor,
    executor: DrizzleRO = this.dbRO,
  ): Promise<ListAsksResponse> {
    this.logger.debug({ input }, "Listing Asks");

    let listInput: ListAsksInput;
    let onlyBefore: Date | undefined;

    // Handle cursor-based pagination
    if ("cursor" in input) {
      const decoded = decodeCursor(input.cursor, ListAsksInputChecker);
      listInput = decoded.original;
      onlyBefore = decoded.onlyBefore;
    } else {
      listInput = input;
      onlyBefore = new Date();
    }

    // Build query conditions
    const conditions = [eq(ASKS.tenantId, this.tenantUuid)];

    if (onlyBefore) {
      conditions.push(sql`${ASKS.createdAt} <= ${onlyBefore}`);
    }

    // Add filters if provided
    if (listInput.unitId) {
      const unitUuid = UnitIds.toUUID(listInput.unitId);

      // Find ask IDs that reference this unit
      const askRefsWithUnit = await executor
        .select({ askId: ASK_REFERENCES.askId })
        .from(ASK_REFERENCES)
        .where(
          and(
            eq(ASK_REFERENCES.unitId, unitUuid),
            listInput.referenceDirection
              ? eq(
                  ASK_REFERENCES.referenceDirection,
                  listInput.referenceDirection,
                )
              : sql`1=1`,
          ),
        );

      if (askRefsWithUnit.length > 0) {
        conditions.push(
          inArray(
            ASKS.askId,
            askRefsWithUnit.map((ref) => ref.askId),
          ),
        );
      } else {
        // No matching references, return empty result
        return {
          items: [],
          total: 0,
          cursor: null,
        };
      }
    }

    // Count total matching items
    const [total] = await executor
      .select({ count: count().mapWith(Number) })
      .from(ASKS)
      .where(and(...conditions));

    if (!total) {
      throw new Error("Failed when counting asks");
    }

    // Get paginated results
    const items = await executor
      .select()
      .from(ASKS)
      .where(and(...conditions))
      .orderBy(desc(ASKS.createdAt))
      .limit(listInput.limit)
      .offset(listInput.offset);

    // Map to public DTOs
    const askListItems: AskListItem[] = items.map((item) => ({
      __type: "AskListItem",
      askId: AskIds.toRichId(item.askId),
      tenantId: TenantIds.toRichId(item.tenantId),
      hardcodeKind: item.hardcodeKind || undefined,
      sourceAgentName: item.sourceAgentName || undefined,
      visibility: item.visibility,
      multipleAnswerStrategy: item.multipleAnswerStrategy,
      createdAt: item.createdAt.toISOString(),
    }));

    // Generate next cursor if there are more results
    let cursor: string | null = null;
    if (
      askListItems.length > 0 &&
      listInput.offset + askListItems.length < total.count
    ) {
      cursor = encodeCursor(
        listInput,
        listInput.offset + askListItems.length,
        onlyBefore,
      );
    }

    return {
      items: askListItems,
      total: total.count,
      cursor,
    };
  }
}
