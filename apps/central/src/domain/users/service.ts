import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { eq, ilike, sql } from "drizzle-orm";
import gravatar from "gravatar-url";
import { type Logger } from "pino";

import {
  type DBUserEmail,
  type DBUserExternalId,
  type DBUser,
  type DBUserTag,
  type DBTenant,
  type DBAuthConnector,
} from "../../_db/models.js";
import {
  USERS,
  USER_EMAILS,
  USER_EXTERNAL_IDS,
  USER_TAGS,
} from "../../_db/schema/index.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.server.js";
import { type VaultService } from "../../lib/functional/vault/service.js";

import { type IdPUserInfo, type UserPrivate } from "./schemas.js";

export class UserService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly vault: VaultService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  async getByUserId(
    userId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUser | null> {
    const user = await executor
      .select()
      .from(USERS)
      .where(eq(USERS.userId, userId))
      .limit(1);

    return user[0] ?? null;
  }

  async getByEmail(
    email: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUser | null> {
    const result = await executor
      .select({
        user: USERS,
      })
      .from(USERS)
      .innerJoin(USER_EMAILS, eq(USERS.userId, USER_EMAILS.userId))
      .where(eq(USER_EMAILS.email, email))
      .limit(1);

    return result[0]?.user ?? null;
  }

  async getByExternalId(
    externalIdType: string,
    externalId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUser | null> {
    const result = await executor
      .select({
        user: USERS,
      })
      .from(USERS)
      .innerJoin(USER_EXTERNAL_IDS, eq(USERS.userId, USER_EXTERNAL_IDS.userId))
      .where(
        sql`${USER_EXTERNAL_IDS.externalIdType} = ${externalIdType} AND ${USER_EXTERNAL_IDS.externalId} = ${externalId}`,
      )
      .limit(1);

    return result[0]?.user ?? null;
  }

  async searchByTag(
    tagKey: string,
    tagValue: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<Array<{ user: DBUser; tag: DBUserTag }>> {
    return executor
      .select({
        user: USERS,
        tag: USER_TAGS,
      })
      .from(USERS)
      .innerJoin(USER_TAGS, eq(USERS.userId, USER_TAGS.userId))
      .where(
        sql`${USER_TAGS.key} = ${tagKey} AND ${USER_TAGS.value} ILIKE ${tagValue}`,
      )
      .orderBy(
        // Sort exact matches to the top
        sql`CASE WHEN ${USER_TAGS.value} = ${tagValue} THEN 0 ELSE 1 END`,
      );
  }

  async withUserById<T>(
    userId: string,
    fn: (user: DBUser) => Promise<T>,
    executor: DrizzleRO = this.dbRO,
  ): Promise<T> {
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }
    return fn(user);
  }

  async getUserPrivate(
    userId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UserPrivate> {
    const user = await executor
      .select()
      .from(USERS)
      .where(eq(USERS.userId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    const [emails, externalIds, tags] = await Promise.all([
      this.getUserEmails(userId, executor),
      this.getUserExternalIds(userId, executor),
      this.getUserTags(userId, executor),
    ]);

    const avatarUrl =
      user.avatarUrl ??
      gravatar(user.userId, {
        size: 256,
        default: "identicon",
        rating: "g",
      });

    return {
      __type: "UserPrivate",
      userId: user.userId,
      tenantId: user.tenantId,
      connectorId: user.connectorId,
      displayName: user.displayName,
      avatarUrl,
      lastAccessedAt: (user.lastAccessedAt ?? undefined)?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: (user.updatedAt ?? undefined)?.toISOString(),
      emails: emails.map((e) => ({
        __type: "UserEmail",
        email: e.email,
        isPrimary: e.isPrimary,
      })),
      externalIds: externalIds.map((e) => ({
        __type: "UserExternalId",
        externalIdType: e.externalIdType,
        externalId: e.externalId,
      })),
      tags: tags.map((t) => ({
        __type: "UserTag",
        key: t.key,
        value: t.value ?? "",
      })),
    };
  }

  async setUserIdPUserInfo(
    userId: string,
    userInfo: IdPUserInfo,
    executor: Drizzle = this.db,
  ): Promise<DBUser> {
    const encrypted = await this.vault.encrypt(userInfo);

    const [result] = await executor
      .update(USERS)
      .set({
        idpUserInfo: encrypted,
      })
      .where(eq(USERS.userId, userId))
      .returning();

    if (!result) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    return result;
  }

  // Tags
  async getUserTags(
    userId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUserTag[]> {
    return executor
      .select()
      .from(USER_TAGS)
      .where(eq(USER_TAGS.userId, userId));
  }

  async setUserTag(
    userId: string,
    key: string,
    value: string | null,
    executor: Drizzle = this.db,
  ): Promise<DBUserTag> {
    const [tag] = await executor
      .insert(USER_TAGS)
      .values({
        userId,
        key,
        value,
      })
      .onConflictDoUpdate({
        target: [USER_TAGS.userId, USER_TAGS.key],
        set: { value },
      })
      .returning();

    if (!tag) {
      throw new Error("Failed to set user tag");
    }

    return tag;
  }

  async deleteUserTag(
    userId: string,
    key: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor
      .delete(USER_TAGS)
      .where(
        sql`${USER_TAGS.userId} = ${userId} AND ${USER_TAGS.key} = ${key}`,
      );
  }

  // External IDs
  async getUserExternalIds(
    userId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUserExternalId[]> {
    return executor
      .select()
      .from(USER_EXTERNAL_IDS)
      .where(eq(USER_EXTERNAL_IDS.userId, userId));
  }

  async setUserExternalId(
    userId: string,
    externalIdType: string,
    externalId: string,
    executor: Drizzle = this.db,
  ): Promise<DBUserExternalId> {
    const [extId] = await executor
      .insert(USER_EXTERNAL_IDS)
      .values({
        userId,
        externalIdType,
        externalId,
      })
      .onConflictDoUpdate({
        target: [USER_EXTERNAL_IDS.userId, USER_EXTERNAL_IDS.externalIdType],
        set: { externalId },
      })
      .returning();

    if (!extId) {
      throw new Error("Failed to insert user external ID");
    }

    return extId;
  }

  async deleteUserExternalId(
    userId: string,
    externalIdType: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor
      .delete(USER_EXTERNAL_IDS)
      .where(
        sql`${USER_EXTERNAL_IDS.userId} = ${userId} AND ${USER_EXTERNAL_IDS.externalIdType} = ${externalIdType}`,
      );
  }

  // Emails
  async getUserEmails(
    userId: string,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUserEmail[]> {
    return executor
      .select()
      .from(USER_EMAILS)
      .where(eq(USER_EMAILS.userId, userId));
  }

  async addUserEmail(
    userId: string,
    email: string,
    isPrimary: boolean = false,
    executor: Drizzle = this.db,
  ): Promise<DBUserEmail> {
    // If this is primary, we need to unset other primary emails first
    if (isPrimary) {
      await executor
        .update(USER_EMAILS)
        .set({ isPrimary: false })
        .where(eq(USER_EMAILS.userId, userId));
    }

    const [emailRecord] = await executor
      .insert(USER_EMAILS)
      .values({
        userId,
        email,
        isPrimary,
      })
      .returning();

    if (!emailRecord) {
      throw new Error("Failed to add user email");
    }

    return emailRecord;
  }

  async setUserEmailPrimary(
    userId: string,
    email: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor.transaction(async (tx) => {
      // Unset all primary flags for this user
      await tx
        .update(USER_EMAILS)
        .set({ isPrimary: false })
        .where(eq(USER_EMAILS.userId, userId));

      // Set the specified email as primary
      await tx
        .update(USER_EMAILS)
        .set({ isPrimary: true })
        .where(
          sql`${USER_EMAILS.userId} = ${userId} AND ${USER_EMAILS.email} = ${email}`,
        );
    });
  }

  async deleteUserEmail(
    userId: string,
    email: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    await executor
      .delete(USER_EMAILS)
      .where(
        sql`${USER_EMAILS.userId} = ${userId} AND ${USER_EMAILS.email} = ${email}`,
      );
  }

  /**
   * Creates a new user from IdP user information
   *
   * @param tenantIdOrObj The tenant ID or tenant object
   * @param connectorIdOrObj The auth connector ID or connector object
   * @param idpUserInfo The IdP user info
   * @param displayName Optional display name (defaults to email or name from idpUserInfo)
   * @param options Additional creation options
   * @param executor Optional database executor
   * @returns The created user
   */
  async createUser(
    tenantIdOrObj: string | DBTenant,
    connectorIdOrObj: string | DBAuthConnector,
    idpUserInfo: IdPUserInfo,
    displayName?: string,
    options: {
      avatarUrl?: string;
      externalIds?: Array<{ type: string; id: string }>;
    } = {},
    executor: Drizzle = this.db,
  ): Promise<DBUser> {
    const tenantId =
      typeof tenantIdOrObj === "string"
        ? tenantIdOrObj
        : tenantIdOrObj.tenantId;

    const connectorId =
      typeof connectorIdOrObj === "string"
        ? connectorIdOrObj
        : connectorIdOrObj.authConnectorId;

    // Determine display name if not provided
    const userDisplayName =
      displayName ||
      idpUserInfo.name ||
      idpUserInfo.preferred_username ||
      idpUserInfo.email.split("@")[0] ||
      idpUserInfo.email;

    // Encrypt IdP user info before storing
    const encryptedIdpUserInfo = await this.vault.encrypt(idpUserInfo);

    return executor.transaction(async (tx) => {
      // Create the user record
      const [user] = await tx
        .insert(USERS)
        .values({
          tenantId,
          connectorId,
          displayName: userDisplayName,
          avatarUrl: options.avatarUrl,
          idpUserInfo: encryptedIdpUserInfo,
          lastAccessedAt: new Date(),
        })
        .returning();

      if (!user) {
        throw new Error("Failed to create user");
      }

      // Add user email from IdP info
      await tx.insert(USER_EMAILS).values({
        userId: user.userId,
        email: idpUserInfo.email,
        isPrimary: true,
      });

      // Add additional emails if present in IdP info
      if (idpUserInfo.email_verified) {
        await this.setUserTag(user.userId, "email_verified", "true", tx);
      }

      // Add external IDs
      if (options.externalIds) {
        for (const extId of options.externalIds) {
          await tx.insert(USER_EXTERNAL_IDS).values({
            userId: user.userId,
            externalIdType: extId.type,
            externalId: extId.id,
          });
        }
      }

      // Add external ID for IdP sub
      await tx.insert(USER_EXTERNAL_IDS).values({
        userId: user.userId,
        externalIdType: `${connectorId}:sub`,
        externalId: idpUserInfo.sub,
      });

      this.logger.info(
        { userId: user.userId, tenantId, email: idpUserInfo.email },
        "Created new user from IdP information",
      );

      return user;
    });
  }
}
