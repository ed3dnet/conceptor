import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { and, eq, isNull } from "drizzle-orm";
import { type Logger } from "pino";

import { type DBUnit, type DBUnitAssignment } from "../../../_db/models.js";
import { UNIT_ASSIGNMENTS } from "../../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../../lib/ext/typebox/index.js";
import { type EventService } from "../../events/service.js";
import { TenantIds, type TenantId } from "../../tenants/id.js";
import { type UserId, UserIds } from "../../users/id.js";
import { type UserService } from "../../users/service.js";
import { type UnitId, UnitIds } from "../id.js";
import { type UnitAssignmentInput } from "../schemas.js";

interface UnitServiceOptions {
  squelchEvents?: boolean;
}

export class UnitAssignmentSubservice {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    private readonly users: UserService,
    readonly tenantId: TenantId,
    private readonly getUnitById: (
      unitId: UnitId,
      executor: DrizzleRO,
    ) => Promise<DBUnit | null>,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  /**
   * Gets unit assignments
   * @param unitId The unit ID
   * @param includeInactive Whether to include inactive assignments
   * @param executor Optional transaction executor
   * @returns Array of unit assignments
   */
  async getUnitAssignments(
    unitId: UnitId,
    includeInactive: boolean = false,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUnitAssignment[]> {
    // First verify the unit belongs to this tenant
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    const whereClause = includeInactive
      ? eq(UNIT_ASSIGNMENTS.unitId, UnitIds.toUUID(unitId))
      : and(
          eq(UNIT_ASSIGNMENTS.unitId, UnitIds.toUUID(unitId)),
          isNull(UNIT_ASSIGNMENTS.endDate),
        );

    const assignments = await executor
      .select()
      .from(UNIT_ASSIGNMENTS)
      .where(whereClause);

    return assignments;
  }

  /**
   * Assigns a user to a unit
   * @param unitId The unit ID
   * @param input Assignment input
   * @param options Service options
   * @param executor Optional transaction executor
   * @returns The created assignment
   */
  async assignUserToUnit(
    unitId: UnitId,
    input: UnitAssignmentInput,
    options: UnitServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<DBUnitAssignment> {
    const logger = this.logger.child({ fn: this.assignUserToUnit.name });

    // Verify unit exists and is individual type
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    if (unit.type !== "individual") {
      throw new BadRequestError(
        "Users can only be assigned to individual units, not organizational units",
      );
    }

    // Verify user exists
    const user = await this.users.getByUserId(input.userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${input.userId}`);
    }

    // Check if user is already assigned to this unit
    const existingAssignments = await executor
      .select()
      .from(UNIT_ASSIGNMENTS)
      .where(
        and(
          eq(UNIT_ASSIGNMENTS.unitId, UnitIds.toUUID(unitId)),
          eq(UNIT_ASSIGNMENTS.userId, UserIds.toUUID(input.userId)),
          isNull(UNIT_ASSIGNMENTS.endDate),
        ),
      );

    if (existingAssignments.length > 0) {
      throw new ConflictError(
        `User ${input.userId} is already assigned to unit ${unitId}`,
      );
    }

    // Create the assignment
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = input.endDate ? new Date(input.endDate) : null;

    // Validate dates
    if (endDate && endDate <= startDate) {
      throw new BadRequestError("End date must be after start date");
    }
    const [assignment] = await executor
      .insert(UNIT_ASSIGNMENTS)
      .values({
        unitId: UnitIds.toUUID(unitId),
        userId: UserIds.toUUID(input.userId),
        startDate,
        endDate,
      })
      .returning();

    if (!assignment) {
      throw new Error("Failed to create unit assignment");
    }

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UserAssignedToUnit",
        tenantId: this.tenantId,
        unitId: UnitIds.toRichId(unitId),
        userId: UserIds.toRichId(input.userId),
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ unitId, userId: input.userId }, "Assigned user to unit");
    return assignment;
  }

  /**
   * Unassigns a user from a unit by setting an end date
   * @param unitId The unit ID
   * @param userId The user ID to unassign
   * @param options Service options
   * @param executor Optional transaction executor
   */
  async unassignUserFromUnit(
    unitId: UnitId,
    userId: UserId,
    options: UnitServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<void> {
    const logger = this.logger.child({ fn: this.unassignUserFromUnit.name });

    // Verify unit exists and belongs to this tenant
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Find the active assignment
    const [assignment] = await executor
      .select()
      .from(UNIT_ASSIGNMENTS)
      .where(
        and(
          eq(UNIT_ASSIGNMENTS.unitId, UnitIds.toUUID(unitId)),
          eq(UNIT_ASSIGNMENTS.userId, UserIds.toUUID(userId)),
          isNull(UNIT_ASSIGNMENTS.endDate),
        ),
      );

    if (!assignment) {
      throw new NotFoundError(
        `No active assignment found for user ${userId} in unit ${unitId}`,
      );
    }

    // Set the end date to now
    const endDate = new Date();
    await executor
      .update(UNIT_ASSIGNMENTS)
      .set({ endDate })
      .where(
        eq(UNIT_ASSIGNMENTS.unitAssignmentId, assignment.unitAssignmentId),
      );

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UserUnassignedFromUnit",
        tenantId: this.tenantId,
        unitId: UnitIds.toRichId(unitId),
        userId: UserIds.toRichId(userId),
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ unitId, userId }, "Unassigned user from unit");
  }
}
