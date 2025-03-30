import {
  BadRequestError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { and, eq } from "drizzle-orm";
import { type Logger } from "pino";

import { type DBUnit } from "../../../_db/models.js";
import { UNITS, UNIT_ANCESTRY } from "../../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../../lib/ext/typebox/index.js";
import { type EventService } from "../../events/service.js";
import { TenantIds, type TenantId } from "../../tenants/id.js";
import { type UnitId, UnitIds } from "../id.js";
import { type UnitPublic, type UnitHierarchyNode } from "../schemas.js";

interface UnitServiceOptions {
  squelchEvents?: boolean;
}

export class UnitHierarchySubservice {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    readonly tenantId: TenantId,
    private readonly getUnitById: (
      unitId: UnitId,
      executor: DrizzleRO,
    ) => Promise<DBUnit | null>,
    private readonly getChildUnits: (
      parentUnitId: UnitId,
      executor: DrizzleRO,
    ) => Promise<DBUnit[]>,
    private readonly toPublic: (unit: DBUnit) => Promise<UnitPublic>,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  /**
   * Attaches a unit to a parent unit or detaches it (when parentUnitId is null)
   * @param unitId The unit ID to attach
   * @param parentUnitId The parent unit ID or null to detach
   * @param options Service options
   * @param executor Optional transaction executor
   * @returns The updated unit
   */
  async attachUnitToParent(
    unitId: UnitId,
    parentUnitId: UnitId | null,
    options: UnitServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<DBUnit> {
    const logger = this.logger.child({ fn: this.attachUnitToParent.name });

    // Verify unit exists
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // If parent unit ID is provided, verify it exists
    if (parentUnitId) {
      const parentUnit = await this.getUnitById(parentUnitId, executor);
      if (!parentUnit) {
        throw new NotFoundError(`Parent unit not found: ${parentUnitId}`);
      }

      // Prevent circular references
      if (UnitIds.toRichId(unit.unitId) === parentUnitId) {
        throw new BadRequestError("Unit cannot be its own parent");
      }
    }

    // Store the previous parent for event dispatching
    const previousParentUnitId = unit.parentUnitId
      ? UnitIds.toRichId(unit.parentUnitId)
      : null;

    // Begin transaction if not already in one
    return await (executor === this.db
      ? this.db.transaction((tx) =>
          this.TX_attachUnitToParent(
            unitId,
            parentUnitId,
            previousParentUnitId,
            options,
            tx,
          ),
        )
      : this.TX_attachUnitToParent(
          unitId,
          parentUnitId,
          previousParentUnitId,
          options,
          executor,
        ));
  }

  /**
   * Transaction-wrapped implementation of attachUnitToParent
   * @private
   */
  private async TX_attachUnitToParent(
    unitId: UnitId,
    parentUnitId: UnitId | null,
    previousParentUnitId: UnitId | null,
    options: UnitServiceOptions,
    executor: Drizzle,
  ): Promise<DBUnit> {
    const logger = this.logger.child({
      fn: this.TX_attachUnitToParent.name,
      unitId,
    });
    const unitUuid = UnitIds.toUUID(unitId);

    // 1. Update the unit's parent
    const [updatedUnit] = await executor
      .update(UNITS)
      .set({
        parentUnitId: parentUnitId ? UnitIds.toUUID(parentUnitId) : null,
      })
      .where(
        and(eq(UNITS.unitId, unitUuid), eq(UNITS.tenantId, this.tenantUuid)),
      )
      .returning();

    if (!updatedUnit) {
      throw new Error(`Failed to update unit ${unitId}`);
    }

    // 2. Delete existing ancestry records for this unit
    await executor
      .delete(UNIT_ANCESTRY)
      .where(eq(UNIT_ANCESTRY.unitId, unitUuid));

    // 3. If we have a parent, create new ancestry records
    if (parentUnitId) {
      const parentUnitUuid = UnitIds.toUUID(parentUnitId);

      // 3.1. Insert direct parent relationship (distance 1)
      await executor.insert(UNIT_ANCESTRY).values({
        unitId: unitUuid,
        ancestorUnitId: parentUnitUuid,
        distance: 1,
      });

      // 3.2. Get all ancestors of the parent and add them with distance + 1
      const parentAncestors = await executor
        .select()
        .from(UNIT_ANCESTRY)
        .where(eq(UNIT_ANCESTRY.unitId, parentUnitUuid));

      if (parentAncestors.length > 0) {
        await executor.insert(UNIT_ANCESTRY).values(
          parentAncestors.map((ancestor) => ({
            unitId: unitUuid,
            ancestorUnitId: ancestor.ancestorUnitId,
            distance: ancestor.distance + 1,
          })),
        );
      }

      logger.info(
        { ancestryCount: parentAncestors.length + 1 },
        "Attached unit to parent",
      );
    }

    // 4. Fire appropriate events if not squelched
    if (!options.squelchEvents) {
      // If there was a previous parent, fire detachment event
      if (previousParentUnitId) {
        await this.events.dispatchEvent({
          __type: "UnitDetachedFromParent",
          tenantId: this.tenantId,
          unitId: UnitIds.toRichId(unitUuid),
          previousParentUnitId,
          timestamp: new Date().toISOString(),
        });
      }

      // If there's a new parent, fire attachment event
      if (parentUnitId) {
        await this.events.dispatchEvent({
          __type: "UnitAttachedToParent",
          tenantId: this.tenantId,
          unitId: UnitIds.toRichId(unitUuid),
          parentUnitId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    logger.info(
      {
        unitId,
        parentUnitId,
        previousParentUnitId,
      },
      parentUnitId ? "Unit attached to parent" : "Unit detached from parent",
    );

    return updatedUnit;
  }

  /**
   * Gets all ancestors of a unit
   * @param unitId The unit ID
   * @param executor Optional transaction executor
   * @returns Array of ancestor units with their distance
   */
  async getUnitAncestry(
    unitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<Array<{ unit: UnitPublic; distance: number }>> {
    // Verify unit exists and belongs to this tenant
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Get all ancestry records
    const ancestryRecords = await executor
      .select({
        ancestor: UNITS,
        distance: UNIT_ANCESTRY.distance,
      })
      .from(UNIT_ANCESTRY)
      .innerJoin(UNITS, eq(UNIT_ANCESTRY.ancestorUnitId, UNITS.unitId))
      .where(
        and(
          eq(UNIT_ANCESTRY.unitId, UnitIds.toUUID(unitId)),
          eq(UNITS.tenantId, this.tenantUuid),
        ),
      )
      .orderBy(UNIT_ANCESTRY.distance);

    // Convert DB units to public units
    const results: Array<{ unit: UnitPublic; distance: number }> = [];
    for (const record of ancestryRecords) {
      results.push({
        unit: await this.toPublic(record.ancestor),
        distance: record.distance,
      });
    }

    return results;
  }

  /**
   * Gets all descendants of a unit
   * @param unitId The unit ID
   * @param executor Optional transaction executor
   * @returns Array of descendant units with their distance
   */
  async getUnitDescendants(
    unitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<Array<{ unit: UnitPublic; distance: number }>> {
    // Verify unit exists and belongs to this tenant
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    // Get all descendant records
    const descendantRecords = await executor
      .select({
        descendant: UNITS,
        distance: UNIT_ANCESTRY.distance,
      })
      .from(UNIT_ANCESTRY)
      .innerJoin(UNITS, eq(UNIT_ANCESTRY.unitId, UNITS.unitId))
      .where(
        and(
          eq(UNIT_ANCESTRY.ancestorUnitId, UnitIds.toUUID(unitId)),
          eq(UNITS.tenantId, this.tenantUuid),
        ),
      )
      .orderBy(UNIT_ANCESTRY.distance);

    // Convert DB units to public units
    const results: Array<{ unit: UnitPublic; distance: number }> = [];
    for (const record of descendantRecords) {
      results.push({
        unit: await this.toPublic(record.descendant),
        distance: record.distance,
      });
    }

    return results;
  }

  /**
   * Gets the full organizational hierarchy starting from a unit
   * @param unitId The unit ID to start from, or null to get the entire hierarchy
   * @param executor Optional transaction executor
   * @returns Hierarchical structure of units
   */
  async getUnitHierarchy(
    unitId: UnitId | null = null,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UnitHierarchyNode[]> {
    // If unitId is provided, verify it exists
    if (unitId) {
      const unit = await this.getUnitById(unitId, executor);
      if (!unit) {
        throw new NotFoundError(`Unit not found: ${unitId}`);
      }
    }

    // Get all units for this tenant
    const allUnits = await executor
      .select()
      .from(UNITS)
      .where(eq(UNITS.tenantId, this.tenantUuid));

    // Create a map of units by ID for quick lookup
    const unitsById = new Map<string, DBUnit>();
    for (const unit of allUnits) {
      unitsById.set(unit.unitId, unit);
    }

    // Create a map of children for each unit
    const childrenMap = new Map<string, string[]>();
    for (const unit of allUnits) {
      if (unit.parentUnitId) {
        const children = childrenMap.get(unit.parentUnitId) || [];
        children.push(unit.unitId);
        childrenMap.set(unit.parentUnitId, children);
      }
    }

    // Function to build the hierarchy recursively
    const buildHierarchy = async (
      currentUnitId: string,
    ): Promise<UnitHierarchyNode> => {
      const currentUnit = unitsById.get(currentUnitId);
      if (!currentUnit) {
        throw new Error(`Unit not found in map: ${currentUnitId}`);
      }

      const publicUnit = await this.toPublic(currentUnit);
      const children = childrenMap.get(currentUnitId) || [];

      return {
        __type: "UnitHierarchyNode",
        unit: publicUnit,
        children: await Promise.all(children.map(buildHierarchy)),
      };
    };

    // If unitId is provided, build hierarchy from that unit
    if (unitId) {
      const rootUnitUuid = UnitIds.toUUID(unitId);
      return [await buildHierarchy(rootUnitUuid)];
    }

    // Otherwise, find all root units (units with no parent) and build hierarchy from each
    const rootUnits = allUnits.filter((unit) => unit.parentUnitId === null);
    return await Promise.all(
      rootUnits.map((unit) => buildHierarchy(unit.unitId)),
    );
  }

  /**
   * Finds the path between two units in the hierarchy
   * @param fromUnitId The starting unit ID
   * @param toUnitId The destination unit ID
   * @param executor Optional transaction executor
   * @returns Array of units forming the path, or null if no path exists
   */
  async findUnitPath(
    fromUnitId: UnitId,
    toUnitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UnitPublic[] | null> {
    // Verify both units exist
    const fromUnit = await this.getUnitById(fromUnitId, executor);
    if (!fromUnit) {
      throw new NotFoundError(`From unit not found: ${fromUnitId}`);
    }

    const toUnit = await this.getUnitById(toUnitId, executor);
    if (!toUnit) {
      throw new NotFoundError(`To unit not found: ${toUnitId}`);
    }

    // Check if they're the same unit
    if (fromUnitId === toUnitId) {
      return [await this.toPublic(fromUnit)];
    }

    // Check if toUnit is an ancestor of fromUnit
    const fromUnitAncestors = await this.getUnitAncestry(fromUnitId, executor);
    const ancestorMap = new Map<string, number>();
    for (const { unit, distance } of fromUnitAncestors) {
      ancestorMap.set(unit.unitId, distance);
    }

    // If toUnit is an ancestor of fromUnit, build the path upward
    if (ancestorMap.has(toUnitId)) {
      // Get all ancestors of fromUnit up to toUnit
      const ancestorsInPath = fromUnitAncestors
        .filter((a) => a.distance <= ancestorMap.get(toUnitId)!)
        .sort((a, b) => a.distance - b.distance);

      // Build the path from fromUnit to toUnit
      return [
        await this.toPublic(fromUnit),
        ...ancestorsInPath.map((a) => a.unit),
      ];
    }

    // Check if toUnit is a descendant of fromUnit
    const toUnitAncestors = await this.getUnitAncestry(toUnitId, executor);
    for (const { unit } of toUnitAncestors) {
      if (unit.unitId === fromUnitId) {
        // toUnit is a descendant of fromUnit
        // We need to find the path from fromUnit to toUnit

        // Get the direct path from toUnit to fromUnit
        const pathToFrom = [
          await this.toPublic(toUnit),
          ...toUnitAncestors
            .filter((a) => a.unit.unitId !== fromUnitId)
            .sort((a, b) => a.distance - b.distance)
            .map((a) => a.unit),
          await this.toPublic(fromUnit),
        ];

        // Reverse it to get from -> to
        return pathToFrom.reverse();
      }
    }

    // If we get here, the units are in different branches
    // Find the lowest common ancestor
    let lowestCommonAncestor: UnitPublic | null = null;
    let lowestDistance = Number.MAX_SAFE_INTEGER;

    for (const {
      unit: fromAncestor,
      distance: fromDistance,
    } of fromUnitAncestors) {
      for (const {
        unit: toAncestor,
        distance: toDistance,
      } of toUnitAncestors) {
        if (
          fromAncestor.unitId === toAncestor.unitId &&
          fromDistance + toDistance < lowestDistance
        ) {
          lowestCommonAncestor = fromAncestor;
          lowestDistance = fromDistance + toDistance;
        }
      }
    }

    // If no common ancestor, there's no path
    if (!lowestCommonAncestor) {
      return null;
    }

    // Build the path: from -> common ancestor -> to
    const fromToAncestor = [
      await this.toPublic(fromUnit),
      ...fromUnitAncestors
        .filter((a) => a.unit.unitId !== lowestCommonAncestor!.unitId)
        .sort((a, b) => a.distance - b.distance)
        .map((a) => a.unit),
    ];

    const ancestorToTo = toUnitAncestors
      .filter((a) => a.unit.unitId !== lowestCommonAncestor!.unitId)
      .sort((a, b) => b.distance - a.distance) // Reverse order
      .map((a) => a.unit);

    return [...fromToAncestor, lowestCommonAncestor, ...ancestorToTo];
  }

  /**
   * Checks if a unit is an ancestor of another unit
   * @param unitId The unit to check
   * @param ancestorUnitId The potential ancestor unit
   * @param executor Optional transaction executor
   * @returns True if ancestorUnitId is an ancestor of unitId
   */
  async isUnitAncestor(
    unitId: UnitId,
    ancestorUnitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<boolean> {
    // Verify both units exist
    const unit = await this.getUnitById(unitId, executor);
    if (!unit) {
      throw new NotFoundError(`Unit not found: ${unitId}`);
    }

    const ancestorUnit = await this.getUnitById(ancestorUnitId, executor);
    if (!ancestorUnit) {
      throw new NotFoundError(`Ancestor unit not found: ${ancestorUnitId}`);
    }

    // Check if they're the same unit
    if (unitId === ancestorUnitId) {
      return false; // A unit is not its own ancestor
    }

    // Check the ancestry table
    const records = await executor
      .select()
      .from(UNIT_ANCESTRY)
      .where(
        and(
          eq(UNIT_ANCESTRY.unitId, UnitIds.toUUID(unitId)),
          eq(UNIT_ANCESTRY.ancestorUnitId, UnitIds.toUUID(ancestorUnitId)),
        ),
      )
      .limit(1);

    return records.length > 0;
  }

  /**
   * Checks if a unit is a descendant of another unit
   * @param unitId The unit to check
   * @param descendantUnitId The potential descendant unit
   * @param executor Optional transaction executor
   * @returns True if descendantUnitId is a descendant of unitId
   */
  async isUnitDescendant(
    unitId: UnitId,
    descendantUnitId: UnitId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<boolean> {
    return this.isUnitAncestor(descendantUnitId, unitId, executor);
  }
}
