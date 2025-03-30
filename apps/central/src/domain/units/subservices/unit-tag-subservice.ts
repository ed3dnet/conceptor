import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { and, eq } from "drizzle-orm";
import { type Logger } from "pino";

import { type DBUnit } from "../../../_db/models.js";
import { UNIT_TAGS } from "../../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../../lib/ext/typebox/index.js";
import { type EventService } from "../../events/service.js";
import { TenantIds, type TenantId } from "../../tenants/id.js";
import { type UnitId, UnitIds } from "../id.js";

export class UnitTagSubservice {
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
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.tenantUuid = TenantIds.toUUID(tenantId);
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
