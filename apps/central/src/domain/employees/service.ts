import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { eq, ilike, sql } from "drizzle-orm";
import gravatar from "gravatar-url";
import { type Logger } from "pino";

import {
  type DBEmployeeEmail,
  type DBEmployeeExternalId,
  type DBEmployee,
  type DBEmployeeTag,
} from "../../_db/models.js";
import {
  EMPLOYEES,
  EMPLOYEE_EMAILS,
  EMPLOYEE_EXTERNAL_IDS,
  EMPLOYEE_TAGS,
} from "../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.server.js";
import { type VaultService } from "../../lib/functional/vault/service.js";

import { type IdPUserInfo, type EmployeePrivate } from "./schemas.js";

export class EmployeeService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly vault: VaultService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  async getByEmployeeId(
    employeeId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBEmployee | null> {
    const employee = await executor
      .select()
      .from(EMPLOYEES)
      .where(eq(EMPLOYEES.employeeId, employeeId))
      .limit(1);

    return employee[0] ?? null;
  }

  async getByEmail(
    email: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBEmployee | null> {
    const result = await executor
      .select({
        employee: EMPLOYEES,
      })
      .from(EMPLOYEES)
      .innerJoin(
        EMPLOYEE_EMAILS,
        eq(EMPLOYEES.employeeId, EMPLOYEE_EMAILS.employeeId),
      )
      .where(eq(EMPLOYEE_EMAILS.email, email))
      .limit(1);

    return result[0]?.employee ?? null;
  }

  async getByExternalId(
    externalIdType: string,
    externalId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBEmployee | null> {
    const result = await executor
      .select({
        employee: EMPLOYEES,
      })
      .from(EMPLOYEES)
      .innerJoin(
        EMPLOYEE_EXTERNAL_IDS,
        eq(EMPLOYEES.employeeId, EMPLOYEE_EXTERNAL_IDS.employeeId),
      )
      .where(
        sql`${EMPLOYEE_EXTERNAL_IDS.externalIdType} = ${externalIdType} AND ${EMPLOYEE_EXTERNAL_IDS.externalId} = ${externalId}`,
      )
      .limit(1);

    return result[0]?.employee ?? null;
  }

  async searchByTag(
    tagKey: string,
    tagValue: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<Array<{ employee: DBEmployee; tag: DBEmployeeTag }>> {
    return executor
      .select({
        employee: EMPLOYEES,
        tag: EMPLOYEE_TAGS,
      })
      .from(EMPLOYEES)
      .innerJoin(
        EMPLOYEE_TAGS,
        eq(EMPLOYEES.employeeId, EMPLOYEE_TAGS.employeeId),
      )
      .where(
        sql`${EMPLOYEE_TAGS.key} = ${tagKey} AND ${EMPLOYEE_TAGS.value} ILIKE ${tagValue}`,
      )
      .orderBy(
        // Sort exact matches to the top
        sql`CASE WHEN ${EMPLOYEE_TAGS.value} = ${tagValue} THEN 0 ELSE 1 END`,
      );
  }

  async withEmployeeById<T>(
    employeeId: string,
    fn: (employee: DBEmployee) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const employee = await this.getByEmployeeId(employeeId, executor);
    if (!employee) {
      throw new NotFoundError(`Employee not found: ${employeeId}`);
    }
    return fn(employee);
  }

  async getEmployeePrivate(
    employeeId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<EmployeePrivate> {
    const employee = await executor
      .select()
      .from(EMPLOYEES)
      .where(eq(EMPLOYEES.employeeId, employeeId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!employee) {
      throw new NotFoundError(`Employee not found: ${employeeId}`);
    }

    const [emails, externalIds, tags] = await Promise.all([
      this.getEmployeeEmails(employeeId, executor),
      this.getEmployeeExternalIds(employeeId, executor),
      this.getEmployeeTags(employeeId, executor),
    ]);

    const avatarUrl =
      employee.avatarUrl ??
      gravatar(employee.employeeId, {
        size: 256,
        default: "identicon",
        rating: "g",
      });

    return {
      __type: "EmployeePrivate",
      employeeId: employee.employeeId,
      tenantId: employee.tenantId,
      connectorId: employee.connectorId,
      displayName: employee.displayName,
      avatarUrl,
      lastAccessedAt: (employee.lastAccessedAt ?? undefined)?.toISOString(),
      createdAt: employee.createdAt.toISOString(),
      updatedAt: (employee.updatedAt ?? undefined)?.toISOString(),
      emails: emails.map((e) => ({
        __type: "EmployeeEmail",
        email: e.email,
        isPrimary: e.isPrimary,
      })),
      externalIds: externalIds.map((e) => ({
        __type: "EmployeeExternalId",
        externalIdType: e.externalIdType,
        externalId: e.externalId,
      })),
      tags: tags.map((t) => ({
        __type: "EmployeeTag",
        key: t.key,
        value: t.value ?? "",
      })),
    };
  }

  async setEmployeeIdPUserInfo(
    employeeId: string,
    userInfo: IdPUserInfo,
    executor: Drizzle = this.db,
  ): Promise<DBEmployee> {
    const encrypted = await this.vault.encrypt(userInfo);

    const [result] = await executor
      .update(EMPLOYEES)
      .set({
        idpUserInfo: encrypted,
      })
      .where(eq(EMPLOYEES.employeeId, employeeId))
      .returning();

    if (!result) {
      throw new NotFoundError(`Employee not found: ${employeeId}`);
    }

    return result;
  }

  // Tags
  async getEmployeeTags(
    employeeId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBEmployeeTag[]> {
    return executor
      .select()
      .from(EMPLOYEE_TAGS)
      .where(eq(EMPLOYEE_TAGS.employeeId, employeeId));
  }

  async setEmployeeTag(
    employeeId: string,
    key: string,
    value: string | null,
    executor: Drizzle = this.db,
  ): Promise<DBEmployeeTag> {
    const [tag] = await executor
      .insert(EMPLOYEE_TAGS)
      .values({
        employeeId,
        key,
        value,
      })
      .onConflictDoUpdate({
        target: [EMPLOYEE_TAGS.employeeId, EMPLOYEE_TAGS.key],
        set: { value },
      })
      .returning();

    if (!tag) {
      throw new Error("Failed to set employee tag");
    }

    return tag;
  }

  async deleteEmployeeTag(
    employeeId: string,
    key: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor
      .delete(EMPLOYEE_TAGS)
      .where(
        sql`${EMPLOYEE_TAGS.employeeId} = ${employeeId} AND ${EMPLOYEE_TAGS.key} = ${key}`,
      );
  }

  // External IDs
  async getEmployeeExternalIds(
    employeeId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBEmployeeExternalId[]> {
    return executor
      .select()
      .from(EMPLOYEE_EXTERNAL_IDS)
      .where(eq(EMPLOYEE_EXTERNAL_IDS.employeeId, employeeId));
  }

  async setEmployeeExternalId(
    employeeId: string,
    externalIdType: string,
    externalId: string,
    executor: Drizzle = this.db,
  ): Promise<DBEmployeeExternalId> {
    const [extId] = await executor
      .insert(EMPLOYEE_EXTERNAL_IDS)
      .values({
        employeeId,
        externalIdType,
        externalId,
      })
      .onConflictDoUpdate({
        target: [
          EMPLOYEE_EXTERNAL_IDS.employeeId,
          EMPLOYEE_EXTERNAL_IDS.externalIdType,
        ],
        set: { externalId },
      })
      .returning();

    if (!extId) {
      throw new Error("Failed to insert employee external ID");
    }

    return extId;
  }

  async deleteEmployeeExternalId(
    employeeId: string,
    externalIdType: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor
      .delete(EMPLOYEE_EXTERNAL_IDS)
      .where(
        sql`${EMPLOYEE_EXTERNAL_IDS.employeeId} = ${employeeId} AND ${EMPLOYEE_EXTERNAL_IDS.externalIdType} = ${externalIdType}`,
      );
  }

  // Emails
  async getEmployeeEmails(
    employeeId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBEmployeeEmail[]> {
    return executor
      .select()
      .from(EMPLOYEE_EMAILS)
      .where(eq(EMPLOYEE_EMAILS.employeeId, employeeId));
  }

  async addEmployeeEmail(
    employeeId: string,
    email: string,
    isPrimary: boolean = false,
    executor: Drizzle = this.db,
  ): Promise<DBEmployeeEmail> {
    // If this is primary, we need to unset other primary emails first
    if (isPrimary) {
      await executor
        .update(EMPLOYEE_EMAILS)
        .set({ isPrimary: false })
        .where(eq(EMPLOYEE_EMAILS.employeeId, employeeId));
    }

    const [emailRecord] = await executor
      .insert(EMPLOYEE_EMAILS)
      .values({
        employeeId,
        email,
        isPrimary,
      })
      .returning();

    if (!emailRecord) {
      throw new Error("Failed to add employee email");
    }

    return emailRecord;
  }

  async setEmployeeEmailPrimary(
    employeeId: string,
    email: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor.transaction(async (tx) => {
      // Unset all primary flags for this employee
      await tx
        .update(EMPLOYEE_EMAILS)
        .set({ isPrimary: false })
        .where(eq(EMPLOYEE_EMAILS.employeeId, employeeId));

      // Set the specified email as primary
      await tx
        .update(EMPLOYEE_EMAILS)
        .set({ isPrimary: true })
        .where(
          sql`${EMPLOYEE_EMAILS.employeeId} = ${employeeId} AND ${EMPLOYEE_EMAILS.email} = ${email}`,
        );
    });
  }

  async deleteEmployeeEmail(
    employeeId: string,
    email: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor
      .delete(EMPLOYEE_EMAILS)
      .where(
        sql`${EMPLOYEE_EMAILS.employeeId} = ${employeeId} AND ${EMPLOYEE_EMAILS.email} = ${email}`,
      );
  }
}
