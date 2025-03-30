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
import {
  StringUUID,
  StringUUIDChecker,
  type StringUUIDType,
} from "../../lib/ext/typebox/index.js";

import { type TenantId, TenantIds } from "./id.js";
import { type CreateTenantInput, type TenantPublic } from "./schemas.js";

export class TenantService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  /**
   * Convert a DB tenant to a public tenant with rich ID
   */
  private toPublicTenant(dbTenant: DBTenant): TenantPublic {
    return {
      tenantId: TenantIds.toRichId(dbTenant.tenantId),
      slug: dbTenant.slug,
      displayName: dbTenant.displayName,
    };
  }

  /**
   * Get a tenant by its UUID
   */
  private async getByUUID(
    uuid: StringUUIDType,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBTenant | null> {
    const tenant = await executor
      .select()
      .from(TENANTS)
      .where(eq(TENANTS.tenantId, uuid))
      .limit(1);

    return tenant[0] ?? null;
  }

  /**
   * Get a tenant by its tenant ID (rich ID or UUID)
   */
  async getByTenantId(
    tenantId: TenantId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<TenantPublic | null> {
    const tenant = await this.getByUUID(TenantIds.toUUID(tenantId), executor);
    return tenant ? this.toPublicTenant(tenant) : null;
  }

  async getBySlug(
    slug: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<TenantPublic | null> {
    const tenant = await executor
      .select()
      .from(TENANTS)
      .where(eq(TENANTS.slug, slug))
      .limit(1);

    return tenant[0] ? this.toPublicTenant(tenant[0]) : null;
  }

  async getByIdOrSlug(
    idOrSlug: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<TenantPublic | null> {
    // Try as rich ID or UUID first
    if (TenantIds.guard(idOrSlug)) {
      return this.getByTenantId(idOrSlug, executor);
    }

    if (StringUUIDChecker.Check(idOrSlug)) {
      const tenant = await this.getByUUID(idOrSlug, executor);
      if (tenant) {
        return this.toPublicTenant(tenant);
      }
    }

    // Try as slug
    const r = await this.getBySlug(idOrSlug, executor);
    if (r) {
      return r;
    }

    return null;
  }

  async list(): Promise<Array<TenantPublic>> {
    const tenants = await this.dbRO.select().from(TENANTS);

    return tenants.map((tenant) => this.toPublicTenant(tenant));
  }

  async withTenantByIdOrSlug<T>(
    idOrSlug: string,
    fn: (tenant: TenantPublic) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const tenant = await this.getByIdOrSlug(idOrSlug, executor);
    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${idOrSlug}`);
    }
    return fn(tenant);
  }

  async withTenantByTenantId<T>(
    tenantId: TenantId,
    fn: (tenant: TenantPublic) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const tenant = await this.getByTenantId(tenantId, executor);
    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${tenantId}`);
    }
    return fn(tenant);
  }

  async withTenantBySlug<T>(
    slug: string,
    fn: (tenant: TenantPublic) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const tenant = await this.getBySlug(slug, executor);
    if (!tenant) {
      throw new NotFoundError(`Tenant not found: ${slug}`);
    }
    return fn(tenant);
  }

  async TX_createTenant(input: CreateTenantInput): Promise<TenantPublic> {
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
          tenantId: input.tenantId
            ? TenantIds.toUUID(input.tenantId)
            : undefined,
          slug: input.slug,
          displayName: input.displayName,
        })
        .returning();

      if (!tenant) {
        throw new Error("Failed to create tenant");
      }

      logger.info({ tenantId: tenant.tenantId }, "Created new tenant");
      return this.toPublicTenant(tenant);
    });
  }
}
