import {
  ConflictError,
  NotFoundError,
} from "@myapp/shared-universal/errors/index.js";
import { eq } from "drizzle-orm";
import { type Logger } from "pino";

import { type DBTenant } from "../../_db/models.js";
import { TENANTS } from "../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.js";

import { type CreateTenantInput } from "./schemas.js";

export class TenantService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  async getByTenantId(
    tenantId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBTenant | null> {
    const tenant = await executor
      .select()
      .from(TENANTS)
      .where(eq(TENANTS.tenantId, tenantId))
      .limit(1);

    return tenant[0] ?? null;
  }

  async getBySlug(
    slug: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBTenant | null> {
    const tenant = await executor
      .select()
      .from(TENANTS)
      .where(eq(TENANTS.slug, slug))
      .limit(1);

    return tenant[0] ?? null;
  }

  async getByIdOrSlug(
    idOrSlug: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBTenant | null> {
    // Try UUID format first - if invalid, treat as slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    if (isUuid) {
      return this.getByTenantId(idOrSlug, executor);
    }
    const r = await this.getBySlug(idOrSlug, executor);
    if (r) {
      return r;
    }

    return this.getByTenantId(idOrSlug, executor);
  }

  async withTenantByIdOrSlug<T>(
    idOrSlug: string,
    fn: (tenant: DBTenant) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const tenant = await this.getByIdOrSlug(idOrSlug, executor);
    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${idOrSlug}`);
    }
    return fn(tenant);
  }

  async withTenantByTenantId<T>(
    tenantId: string,
    fn: (tenant: DBTenant) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T | null> {
    const tenant = await this.getByTenantId(tenantId, executor);
    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${tenantId}`);
    }
    return fn(tenant);
  }

  async withTenantBySlug<T>(
    slug: string,
    fn: (tenant: DBTenant) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T | null> {
    const tenant = await this.getBySlug(slug, executor);
    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${slug}`);
    }
    return fn(tenant);
  }

  async TX_createTenant(input: CreateTenantInput): Promise<DBTenant> {
    const logger = this.logger.child({ fn: this.TX_createTenant.name });

    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(TENANTS)
        .where(eq(TENANTS.slug, input.slug))
        .limit(1);

      if (existing[0]) {
        throw new ConflictError(
          `Tenant with slug ${input.slug} already exists`,
        );
      }

      const [tenant] = await tx
        .insert(TENANTS)
        .values({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tenantId: (input as any).tenantId,
          slug: input.slug,
          displayName: input.displayName,
        })
        .returning();

      if (!tenant) {
        throw new Error("Failed to create tenant");
      }

      logger.info({ tenantId: tenant.tenantId }, "Created new tenant");
      return tenant;
    });
  }
}
