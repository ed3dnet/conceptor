import {
  BadRequestError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { and, eq } from "drizzle-orm";
import { type Logger } from "pino";

import { type DBUnit } from "../../_db/models.js";
import { UNITS } from "../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../lib/ext/typebox/index.js";
import { type EventService } from "../events/service.js";
import { TenantIds, type TenantId } from "../tenants/id.js";
import { UserIds } from "../users/id.js";
import { type UserService } from "../users/service.js";

import { type UnitId, UnitIds } from "./id.js";
import {
  type CreateUnitInput,
  type UnitHierarchyNode,
  type UnitPublic,
  type UpdateUnitInput,
  type UnitWithAssignments,
} from "./schemas.js";
import { UnitAssignmentSubservice } from "./subservices/unit-assignment-subservice.js";
import { UnitHierarchySubservice } from "./subservices/unit-hierarchy-subservice.js";
import { UnitTagSubservice } from "./subservices/unit-tag-subservice.js";

interface UnitServiceOptions {
  squelchEvents?: boolean;
}

export class UnitService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  private _tagSubservice?: UnitTagSubservice;
  private _assignmentSubservice?: UnitAssignmentSubservice;
  private _hierarchySubservice?: UnitHierarchySubservice;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    private readonly users: UserService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  /**
   * Lazily instantiates and returns the UnitTagSubservice
   */
  get tags(): UnitTagSubservice {
    if (!this._tagSubservice) {
      this._tagSubservice = new UnitTagSubservice(
        this.logger,
        this.db,
        this.dbRO,
        this.events,
        this.tenantId,
        this.getUnitByIdInternal.bind(this),
      );
    }
    return this._tagSubservice;
  }

  /**
   * Lazily instantiates and returns the UnitAssignmentSubservice
   */
  get assignments(): UnitAssignmentSubservice {
    if (!this._assignmentSubservice) {
      this._assignmentSubservice = new UnitAssignmentSubservice(
        this.logger,
        this.db,
        this.dbRO,
        this.events,
        this.users,
        this.tenantId,
        this.getUnitByIdInternal.bind(this),
      );
    }
    return this._assignmentSubservice;
  }

  /**
   * Lazily instantiates and returns the UnitHierarchySubservice
   */
  get hierarchy(): UnitHierarchySubservice {
    if (!this._hierarchySubservice) {
      this._hierarchySubservice = new UnitHierarchySubservice(
        this.logger,
        this.db,
        this.dbRO,
        this.events,
        this.tenantId,
        this.getUnitByIdInternal.bind(this),
        this.getChildUnitsInternal.bind(this),
        this.toPublic.bind(this),
      );
    }
    return this._hierarchySubservice;
  }

  /**
   * Converts a database unit to a public unit
   * @param unit Database unit
   * @returns Public unit representation
   */
  async toPublic(unit: DBUnit): Promise<UnitPublic> {
    return {
      __type: "UnitPublic",
      unitId: UnitIds.toRichId(unit.unitId),
      name: unit.name,
      type: unit.type,
      parentUnitId: unit.parentUnitId
        ? UnitIds.toRichId(unit.parentUnitId)
        : null,
      description: unit.description,
    };
  }

  /**
   * Converts a database unit to a public unit with assignments
   * @param unit Database unit
   * @returns Public unit with assignments
   */
  async toPublicWithAssignments(unit: DBUnit): Promise<UnitWithAssignments> {
    const assignments = await this.assignments.getUnitAssignments(
      UnitIds.toRichId(unit.unitId),
    );

    return {
      __type: "UnitWithAssignments",
      unitId: UnitIds.toRichId(unit.unitId),
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

  /**
   * Internal method to get a unit by ID
   * @private
   */
  private async getUnitByIdInternal(
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

  /**
   * Gets a unit by ID
   * @param unitId The unit ID
   * @param executor Optional transaction executor
   * @returns The unit or null if not found
   */
  async getUnitById(
    unitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UnitPublic | null> {
    const unit = await this.getUnitByIdInternal(unitId, executor);
    return unit ? await this.toPublic(unit) : null;
  }

  /**
   * Gets a unit by ID with assignments
   * @param unitId The unit ID
   * @param executor Optional transaction executor
   * @returns The unit with assignments or null if not found
   */
  async getUnitByIdWithAssignments(
    unitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UnitWithAssignments | null> {
    const unit = await this.getUnitByIdInternal(unitId, executor);
    return unit ? await this.toPublicWithAssignments(unit) : null;
  }

  /**
   * Executes a function with a unit if it exists
   * @param unitId The unit ID
   * @param fn Function to execute with the unit
   * @param executor Optional transaction executor
   * @returns Result of the function
   * @throws NotFoundError if unit not found
   */
  async withUnitById<T>(
    unitId: UnitId,
    fn: (unit: UnitPublic) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }
    return fn(unit);
  }

  /**
   * Internal method to get child units
   * @private
   */
  private async getChildUnitsInternal(
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

  /**
   * Gets child units of a parent unit
   * @param parentUnitId The parent unit ID
   * @param executor Optional transaction executor
   * @returns Array of child units
   */
  async getChildUnits(
    parentUnitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UnitPublic[]> {
    const childUnits = await this.getChildUnitsInternal(parentUnitId, executor);
    return Promise.all(childUnits.map((unit) => this.toPublic(unit)));
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
  ): Promise<UnitPublic> {
    const logger = this.logger.child({ fn: this.createUnit.name });

    // Begin transaction if not already in one
    const dbUnit = await (executor === this.db
      ? this.db.transaction((tx) => this.TX_createUnit(input, options, tx))
      : this.TX_createUnit(input, options, executor));

    return this.toPublic(dbUnit);
  }

  /**
   * Transaction-wrapped implementation of createUnit
   * @private
   */
  private async TX_createUnit(
    input: CreateUnitInput,
    options: UnitServiceOptions,
    executor: Drizzle,
  ): Promise<DBUnit> {
    const logger = this.logger.child({ fn: "TX_createUnit" });

    // Create the unit without parent initially
    const [unit] = await executor
      .insert(UNITS)
      .values({
        tenantId: this.tenantUuid,
        name: input.name,
        type: input.type,
        parentUnitId: null, // We'll set this with attachUnitToParent
        description: input.description,
      })
      .returning();

    if (!unit) {
      throw new Error("Failed to create unit");
    }

    // If a parent unit is specified, attach it
    if (input.parentUnitId) {
      logger.info(
        {
          unitId: UnitIds.toRichId(unit.unitId),
          parentUnitId: input.parentUnitId,
        },
        "Attaching unit to parent as part of unit creation",
      );
      await this.hierarchy.attachUnitToParent(
        UnitIds.toRichId(unit.unitId),
        input.parentUnitId,
        options,
        executor,
      );
    }

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UnitCreated",
        tenantId: this.tenantId,
        unitId: UnitIds.toRichId(unit.unitId),
        name: unit.name,
        type: unit.type,
        parentUnitId: input.parentUnitId || null,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info({ unitId: UnitIds.toRichId(unit.unitId) }, "Created unit");
    return unit;
  }

  /**
   * Updates an existing unit. It does NOT handle unit re-parenting; the
   * hierarchy subservice controls that.
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
  ): Promise<UnitPublic> {
    const logger = this.logger.child({ fn: this.updateUnit.name });

    // Begin transaction if not already in one
    const dbUnit = await (executor === this.db
      ? this.db.transaction((tx) =>
          this.TX_updateUnit(unitId, input, options, tx),
        )
      : this.TX_updateUnit(unitId, input, options, executor));

    return this.toPublic(dbUnit);
  }

  /**
   * Transaction-wrapped implementation of updateUnit
   * @private
   */
  private async TX_updateUnit(
    unitId: UnitId,
    input: UpdateUnitInput,
    options: UnitServiceOptions,
    executor: Drizzle,
  ): Promise<DBUnit> {
    const logger = this.logger.child({ fn: "TX_updateUnit" });

    // Verify unit exists
    const existingUnit = await this.getUnitByIdInternal(unitId, executor);
    if (!existingUnit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Track changed fields for event
    const changedFields: string[] = [];
    const updateValues: Partial<DBUnit> = {};

    // Handle other fields
    if (input.name !== undefined && input.name !== existingUnit.name) {
      updateValues.name = input.name;
      changedFields.push("name");
    }

    if (
      input.description !== undefined &&
      input.description !== existingUnit.description
    ) {
      updateValues.description = input.description;
      changedFields.push("description");
    }

    // Update the unit if there are non-parent changes
    let updatedUnit = existingUnit;
    if (Object.keys(updateValues).length > 0) {
      const [updated] = await executor
        .update(UNITS)
        .set(updateValues)
        .where(
          and(
            eq(UNITS.unitId, UnitIds.toUUID(unitId)),
            eq(UNITS.tenantId, this.tenantUuid),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Failed to update unit");
      }

      updatedUnit = updated;
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
    const existingUnit = await this.getUnitByIdInternal(unitId, executor);
    if (!existingUnit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Check for child units
    const childUnits = await this.getChildUnitsInternal(unitId, executor);
    if (childUnits.length > 0) {
      throw new BadRequestError(
        `Cannot delete unit with child units. Found ${childUnits.length} child units.`,
      );
    }

    // Check for active assignments
    const activeAssignments = await this.assignments.getUnitAssignments(
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
   * Gets the unit hierarchy
   * @param rootUnitId Optional root unit ID to start from
   * @param executor Optional transaction executor
   * @returns Hierarchical structure of units
   */
  async getUnitHierarchy(
    rootUnitId: UnitId | null = null,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UnitHierarchyNode[]> {
    return this.hierarchy.getUnitHierarchy(rootUnitId, executor);
  }
}
