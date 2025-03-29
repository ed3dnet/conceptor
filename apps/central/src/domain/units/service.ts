import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { type Static } from "@sinclair/typebox";
import { and, eq, isNull, not } from "drizzle-orm";
import { type Logger } from "pino";
import { ulid, ulidToUUID } from "ulidx";

import { type DBUnit, type DBUnitAssignment } from "../../_db/models.js";
import {
  UNITS,
  UNIT_ASSIGNMENTS,
  UNIT_TAGS,
  USER_TAGS,
} from "../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../lib/ext/typebox/index.js";
import { type EventService } from "../events/service.js";
import { TenantIds, type TenantId } from "../tenants/id.js";
import { type UserId, UserIds } from "../users/id.js";
import { type UserService } from "../users/service.js";

import { type UnitId, UnitIds } from "./id.js";
import {
  type CreateUnitInput,
  type UnitAssignmentInput,
  type UnitPublic,
  type UpdateUnitInput,
  type UnitWithAssignments,
} from "./schemas.js";

interface UnitServiceOptions {
  squelchEvents?: boolean;
}

export class UnitService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    private readonly users: UserService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  async toPublic(unit: DBUnit): Promise<UnitPublic> {
    return {
      __type: "UnitPublic",
      id: UnitIds.toRichId(unit.unitId),
      name: unit.name,
      type: unit.type,
      parentUnitId: unit.parentUnitId
        ? UnitIds.toRichId(unit.parentUnitId)
        : null,
      description: unit.description,
    };
  }

  async toPublicWithAssignments(unit: DBUnit): Promise<UnitWithAssignments> {
    const assignments = await this.dbRO
      .select()
      .from(UNIT_ASSIGNMENTS)
      .where(
        and(
          eq(UNIT_ASSIGNMENTS.unitId, UnitIds.toUUID(unit.unitId)),
          isNull(UNIT_ASSIGNMENTS.endDate),
        ),
      );

    return {
      __type: "UnitWithAssignments",
      id: UnitIds.toRichId(unit.unitId),
      name: unit.name,
      type: unit.type,
      parentUnitId: unit.parentUnitId
        ? UnitIds.toRichId(unit.parentUnitId)
        : null,
      description: unit.description,
      assignments: assignments.map((a) => ({
        userId: UserIds.toRichId(a.userId),
        startDate: a.startDate.toISOString(),
        endDate: a.endDate ? a.endDate.toISOString() : undefined,
      })),
    };
  }

  async getUnitById(
    unitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUnit | null> {
    const units = await executor
      .select()
      .from(UNITS)
      .where(
        and(
          eq(UNITS.unitId, UnitIds.toUUID(unitId)),
          eq(UNITS.tenantId, this.tenantUuid),
        ),
      )
      .limit(1);

    return units[0] || null;
  }

  async withUnitById<T>(
    unitId: UnitId,
    fn: (unit: DBUnit) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }
    return fn(unit);
  }

  async getChildUnits(
    parentUnitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUnit[]> {
    return executor
      .select()
      .from(UNITS)
      .where(
        and(
          eq(UNITS.parentUnitId, UnitIds.toUUID(parentUnitId)),
          eq(UNITS.tenantId, this.tenantUuid),
        ),
      );
  }

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
   * Creates a new unit
   * @param input Unit creation input
   * @param options Service options
   * @param executor Optional transaction executor
   * @returns The created unit
   */
  async createUnit(
    input: CreateUnitInput,
    options: UnitServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<DBUnit> {
    const logger = this.logger.child({ fn: this.createUnit.name });

    // Validate parent unit exists if specified
    if (input.parentUnitId) {
      const parentUnit = await this.getUnitById(input.parentUnitId, executor);
      if (!parentUnit) {
        throw new NotFoundError(`Parent unit not found: ${input.parentUnitId}`);
      }
    }

    // Create the unit
    const [unit] = await executor
      .insert(UNITS)
      .values({
        tenantId: this.tenantUuid,
        name: input.name,
        type: input.type,
        parentUnitId: input.parentUnitId
          ? UnitIds.toUUID(input.parentUnitId)
          : null,
        description: input.description,
      })
      .returning();

    if (!unit) {
      throw new Error("Failed to create unit");
    }

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UnitCreated",
        tenantId: this.tenantId,
        unitId: UnitIds.toRichId(unit.unitId),
        name: unit.name,
        type: unit.type,
        parentUnitId: unit.parentUnitId
          ? UnitIds.toRichId(unit.parentUnitId)
          : null,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ unitId: UnitIds.toRichId(unit.unitId) }, "Created unit");
    return unit;
  }

  /**
   * Updates an existing unit
   * @param unitId The unit ID to update
   * @param input Update input
   * @param options Service options
   * @param executor Optional transaction executor
   * @returns The updated unit
   */
  async updateUnit(
    unitId: UnitId,
    input: UpdateUnitInput,
    options: UnitServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<DBUnit> {
    const logger = this.logger.child({ fn: this.updateUnit.name });

    // Verify unit exists
    const existingUnit = await this.getUnitById(unitId, executor);
    if (!existingUnit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Validate parent unit exists if specified
    if (input.parentUnitId) {
      const parentUnit = await this.getUnitById(input.parentUnitId, executor);
      if (!parentUnit) {
        throw new NotFoundError(`Parent unit not found: ${input.parentUnitId}`);
      }

      // Prevent circular references
      if (input.parentUnitId === unitId) {
        throw new BadRequestError("Unit cannot be its own parent");
      }
    }

    // Track changed fields for event
    const changedFields: string[] = [];
    const updateValues: Partial<DBUnit> = {};

    if (input.name !== undefined && input.name !== existingUnit.name) {
      updateValues.name = input.name;
      changedFields.push("name");
    }

    if (
      input.parentUnitId !== undefined &&
      input.parentUnitId !== existingUnit.parentUnitId
    ) {
      updateValues.parentUnitId = UnitIds.toUUID(input.parentUnitId);
      changedFields.push("parentUnitId");
    }

    if (
      input.description !== undefined &&
      input.description !== existingUnit.description
    ) {
      updateValues.description = input.description;
      changedFields.push("description");
    }

    // If nothing changed, return existing unit
    if (Object.keys(updateValues).length === 0) {
      return existingUnit;
    }

    // Update the unit
    const [updatedUnit] = await executor
      .update(UNITS)
      .set(updateValues)
      .where(
        and(
          eq(UNITS.unitId, UnitIds.toUUID(unitId)),
          eq(UNITS.tenantId, this.tenantUuid),
        ),
      )
      .returning();

    if (!updatedUnit) {
      throw new Error("Failed to update unit");
    }

    // Fire event if not squelched and fields changed
    if (!options.squelchEvents && changedFields.length > 0) {
      await this.events.dispatchEvent({
        __type: "UnitUpdated",
        tenantId: this.tenantId,
        unitId: UnitIds.toRichId(updatedUnit.unitId),
        changedFields,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ unitId, changedFields }, "Updated unit");
    return updatedUnit;
  }

  /**
   * Deletes a unit if it has no children or active assignments
   * @param unitId The unit ID to delete
   * @param options Service options
   * @param executor Optional transaction executor
   */
  async deleteUnit(
    unitId: UnitId,
    options: UnitServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<void> {
    const logger = this.logger.child({ fn: this.deleteUnit.name });

    // Verify unit exists
    const existingUnit = await this.getUnitById(unitId, executor);
    if (!existingUnit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Check for child units
    const childUnits = await this.getChildUnits(unitId, executor);
    if (childUnits.length > 0) {
      throw new BadRequestError(
        `Cannot delete unit with child units. Found ${childUnits.length} child units.`,
      );
    }

    // Check for active assignments
    const activeAssignments = await this.getUnitAssignments(
      unitId,
      false,
      executor,
    );
    if (activeAssignments.length > 0) {
      throw new BadRequestError(
        `Cannot delete unit with active assignments. Found ${activeAssignments.length} active assignments.`,
      );
    }

    // Delete the unit
    await executor
      .delete(UNITS)
      .where(
        and(
          eq(UNITS.unitId, UnitIds.toUUID(unitId)),
          eq(UNITS.tenantId, this.tenantUuid),
        ),
      );

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UnitDeleted",
        tenantId: this.tenantId,
        unitId: UnitIds.toRichId(unitId),
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ unitId }, "Deleted unit");
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

  /**
   * Sets a tag on a unit
   * @param unitId The unit ID
   * @param key The tag key
   * @param value The tag value
   * @param executor Optional transaction executor
   */
  async setUnitTag(
    unitId: UnitId,
    key: string,
    value: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    const logger = this.logger.child({ fn: this.setUnitTag.name });

    // Verify unit exists and belongs to this tenant
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Use "on conflict do update" pattern for upsert
    await executor
      .insert(UNIT_TAGS)
      .values({
        unitId: UnitIds.toUUID(unitId),
        key,
        value,
      })
      .onConflictDoUpdate({
        target: [UNIT_TAGS.unitId, UNIT_TAGS.key],
        set: { value },
      });

    logger.info({ unitId, key, value }, "Set unit tag");
  }

  /**
   * Gets all tags for a unit
   * @param unitId The unit ID
   * @param executor Optional transaction executor
   * @returns Map of tag keys to values
   */
  async getUnitTags(
    unitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<Record<string, string>> {
    // Verify unit exists and belongs to this tenant
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    const tags = await executor
      .select()
      .from(UNIT_TAGS)
      .where(eq(UNIT_TAGS.unitId, UnitIds.toUUID(unitId)));

    return tags.reduce(
      (acc, tag) => {
        acc[tag.key] = tag.value || "";
        return acc;
      },
      {} as Record<string, string>,
    );
  }
}
