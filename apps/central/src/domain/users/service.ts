import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { eq, ilike, sql, and } from "drizzle-orm";
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
} from "../../lib/datastores/postgres/types.js";
import { type StringUUID } from "../../lib/ext/typebox/index.js";
import { type VaultService } from "../../lib/functional/vault/service.js";
import { AuthConnectorIds } from "../auth-connectors/id.js";
import { type EventService } from "../events/service.js";
import { type TenantId, TenantIds } from "../tenants/id.js";

import { type UserId, UserIds } from "./id.js";
import {
  type CreateUserInput,
  type IdPUserInfo,
  type UserPrivate,
} from "./schemas.js";

interface UserServiceOptions {
  squelchEvents?: boolean;
}

export class UserService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly vault: VaultService,
    private readonly events: EventService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({ component: this.constructor.name, tenantId });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  async getByUserId(
    userId: UserId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUser | null> {
    const user = await executor
      .select()
      .from(USERS)
      .where(
        and(
          eq(USERS.userId, UserIds.toUUID(userId)),
          eq(USERS.tenantId, this.tenantUuid),
        ),
      )
      .limit(1);

    return user[0] ?? null;
  }

  async getByUserUUID(
    userUuid: StringUUID,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUser | null> {
    const user = await executor
      .select()
      .from(USERS)
      .where(
        and(eq(USERS.userId, userUuid), eq(USERS.tenantId, this.tenantUuid)),
      )
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
      .where(
        and(eq(USER_EMAILS.email, email), eq(USERS.tenantId, this.tenantUuid)),
      )
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
        and(
          eq(USER_EXTERNAL_IDS.externalIdKind, externalIdType),
          eq(USER_EXTERNAL_IDS.externalId, externalId),
          eq(USERS.tenantId, this.tenantUuid),
        ),
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
        and(
          eq(USER_TAGS.key, tagKey),
          ilike(USER_TAGS.value, tagValue),
          eq(USERS.tenantId, this.tenantUuid),
        ),
      )
      .orderBy(
        // Sort exact matches to the top
        sql`CASE WHEN ${USER_TAGS.value} = ${tagValue} THEN 0 ELSE 1 END`,
      );
  }

  async withUserById<T>(
    userId: UserId,
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
    userId: UserId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<UserPrivate> {
    const user = await executor
      .select()
      .from(USERS)
      .where(
        and(
          eq(USERS.userId, UserIds.toUUID(userId)),
          eq(USERS.tenantId, this.tenantUuid),
        ),
      )
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
      userId: UserIds.toRichId(user.userId),
      tenantId: TenantIds.toRichId(user.tenantId),
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
        externalIdKind: e.externalIdKind,
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
    userId: UserId,
    userInfo: IdPUserInfo,
    executor: Drizzle = this.db,
  ): Promise<DBUser> {
    const encrypted = await this.vault.encrypt(userInfo);

    const [result] = await executor
      .update(USERS)
      .set({
        idpUserInfo: encrypted,
      })
      .where(
        and(
          eq(USERS.userId, UserIds.toUUID(userId)),
          eq(USERS.tenantId, this.tenantUuid),
        ),
      )
      .returning();

    if (!result) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    return result;
  }

  // Tags
  async getUserTags(
    userId: UserId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUserTag[]> {
    // For tags, we need to join with USERS to ensure tenant isolation
    const result = await executor
      .select({
        tag: USER_TAGS,
      })
      .from(USER_TAGS)
      .innerJoin(USERS, eq(USER_TAGS.userId, USERS.userId))
      .where(
        and(
          eq(USER_TAGS.userId, UserIds.toUUID(userId)),
          eq(USERS.tenantId, this.tenantUuid),
        ),
      );

    return result.map((r) => r.tag);
  }

  async setUserTag(
    userId: UserId,
    key: string,
    value: string | null,
    executor: Drizzle = this.db,
  ): Promise<DBUserTag> {
    // First verify the user belongs to this tenant
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    const [tag] = await executor
      .insert(USER_TAGS)
      .values({
        userId: UserIds.toUUID(userId),
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
    userId: UserId,
    key: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    // First verify the user belongs to this tenant
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    await executor
      .delete(USER_TAGS)
      .where(
        and(
          eq(USER_TAGS.userId, UserIds.toUUID(userId)),
          eq(USER_TAGS.key, key),
        ),
      );
  }

  // External IDs
  async getUserExternalIds(
    userId: UserId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUserExternalId[]> {
    // For external IDs, we need to join with USERS to ensure tenant isolation
    const result = await executor
      .select({
        extId: USER_EXTERNAL_IDS,
      })
      .from(USER_EXTERNAL_IDS)
      .innerJoin(USERS, eq(USER_EXTERNAL_IDS.userId, USERS.userId))
      .where(
        and(
          eq(USER_EXTERNAL_IDS.userId, UserIds.toUUID(userId)),
          eq(USERS.tenantId, this.tenantUuid),
        ),
      );

    return result.map((r) => r.extId);
  }

  async setUserExternalId(
    userId: UserId,
    externalIdKind: string,
    externalId: string,
    executor: Drizzle = this.db,
  ): Promise<DBUserExternalId> {
    // First verify the user belongs to this tenant
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    const [extId] = await executor
      .insert(USER_EXTERNAL_IDS)
      .values({
        userId: UserIds.toUUID(userId),
        externalIdKind,
        externalId,
      })
      .onConflictDoUpdate({
        target: [USER_EXTERNAL_IDS.userId, USER_EXTERNAL_IDS.externalIdKind],
        set: { externalId },
      })
      .returning();

    if (!extId) {
      throw new Error("Failed to insert user external ID");
    }

    return extId;
  }

  async deleteUserExternalId(
    userId: UserId,
    externalIdType: string,
    executor: Drizzle = this.db,
  ): Promise<void> {
    // First verify the user belongs to this tenant
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }
    await executor
      .delete(USER_EXTERNAL_IDS)
      .where(
        and(
          eq(USER_EXTERNAL_IDS.userId, UserIds.toUUID(userId)),
          eq(USER_EXTERNAL_IDS.externalIdKind, externalIdType),
        ),
      );
  }

  // Emails
  async getUserEmails(
    userId: UserId,
    executor: DrizzleRO = this.dbRO,
  ): Promise<DBUserEmail[]> {
    // For emails, we need to join with USERS to ensure tenant isolation
    const result = await executor
      .select({
        email: USER_EMAILS,
      })
      .from(USER_EMAILS)
      .innerJoin(USERS, eq(USER_EMAILS.userId, USERS.userId))
      .where(
        and(
          eq(USER_EMAILS.userId, UserIds.toUUID(userId)),
          eq(USERS.tenantId, this.tenantUuid),
        ),
      );

    return result.map((r) => r.email);
  }

  /**
   * Creates a new user
   *
   * @param input User creation parameters
   * @param options Service options
   * @param executor Optional database executor
   * @returns The created user
   */
  async createUser(
    input: CreateUserInput,
    options: UserServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<DBUser> {
    const {
      connectorId,
      idpUserInfo,
      displayName,
      userId,
      avatarUrl,
      externalIds,
    } = input;

    // Ensure the tenant ID matches this service's tenant
    if (input.tenantId !== this.tenantId) {
      throw new Error(
        `Cannot create user for different tenant: ${input.tenantId}`,
      );
    }

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
          userId: userId ? UserIds.toUUID(userId) : undefined,
          tenantId: this.tenantUuid,
          connectorId: AuthConnectorIds.toUUID(connectorId),
          displayName: userDisplayName,
          avatarUrl,
          idpUserInfo: encryptedIdpUserInfo,
          lastAccessedAt: new Date(),
        })
        .returning();

      if (!user) {
        throw new Error("Failed to create user");
      }
      const newUserId = UserIds.toRichId(user.userId);

      // Add user email from IdP info
      await tx.insert(USER_EMAILS).values({
        userId: user.userId,
        email: idpUserInfo.email,
        isPrimary: true,
      });

      // Add additional emails if present in IdP info
      if (idpUserInfo.email_verified) {
        await this.setUserTag(newUserId, "email_verified", "true", tx);
      }

      // Add external IDs
      if (externalIds) {
        for (const extId of externalIds) {
          await tx.insert(USER_EXTERNAL_IDS).values({
            userId: user.userId,
            externalIdKind: extId.kind,
            externalId: extId.id,
          });
        }
      }

      // Add external ID for IdP sub
      await tx.insert(USER_EXTERNAL_IDS).values({
        userId: user.userId,
        externalIdKind: `${connectorId}:sub`,
        externalId: idpUserInfo.sub,
      });

      this.logger.info(
        {
          userId: user.userId,
          tenantId: this.tenantId,
          email: idpUserInfo.email,
        },
        "Created new user from IdP information",
      );

      // Fire event if not squelched
      if (!options.squelchEvents) {
        await this.events.dispatchEvent({
          __type: "UserCreated",
          tenantId: this.tenantId,
          userId: UserIds.toRichId(user.userId),
          email: idpUserInfo.email,
          displayName: userDisplayName,
          timestamp: new Date().toISOString(),
        });
      }

      return user;
    });
  }

  /**
   * Adds an email to a user
   * @param userId The user ID
   * @param email The email to add
   * @param isPrimary Whether this is the primary email
   * @param options Service options
   * @param executor Optional transaction executor
   * @returns The created email record
   */
  async addUserEmail(
    userId: UserId,
    email: string,
    isPrimary: boolean = false,
    options: UserServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<DBUserEmail> {
    // First verify the user belongs to this tenant
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    // If this is primary, we need to unset other primary emails first
    const userUuid = UserIds.toUUID(userId);
    if (isPrimary) {
      await executor
        .update(USER_EMAILS)
        .set({ isPrimary: false })
        .where(eq(USER_EMAILS.userId, userUuid));
    }

    const [emailRecord] = await executor
      .insert(USER_EMAILS)
      .values({
        userId: userUuid,
        email,
        isPrimary,
      })
      .returning();

    if (!emailRecord) {
      throw new Error("Failed to add user email");
    }

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UserEmailAdded",
        tenantId: this.tenantId,
        userId,
        email,
        isPrimary,
        timestamp: new Date().toISOString(),
      });
    }

    return emailRecord;
  }

  /**
   * Sets a user email as primary
   * @param userId The user ID
   * @param email The email to set as primary
   * @param options Service options
   * @param executor Optional transaction executor
   */
  async setUserEmailPrimary(
    userId: UserId,
    email: string,
    options: UserServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<void> {
    // First verify the user belongs to this tenant
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    await executor.transaction(async (tx) => {
      const userUuid = UserIds.toUUID(userId);

      // Unset all primary flags for this user
      await tx
        .update(USER_EMAILS)
        .set({ isPrimary: false })
        .where(eq(USER_EMAILS.userId, userUuid));

      // Set the specified email as primary
      await tx
        .update(USER_EMAILS)
        .set({ isPrimary: true })
        .where(
          and(
            eq(USER_EMAILS.userId, userUuid),
            ilike(USER_EMAILS.email, email),
          ),
        );
    });

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UserEmailSetPrimary",
        tenantId: this.tenantId,
        userId,
        email,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Deletes a user email
   * @param userId The user ID
   * @param email The email to delete
   * @param options Service options
   * @param executor Optional transaction executor
   */
  async deleteUserEmail(
    userId: UserId,
    email: string,
    options: UserServiceOptions = {},
    executor: Drizzle = this.db,
  ): Promise<void> {
    // First verify the user belongs to this tenant
    const user = await this.getByUserId(userId, executor);
    if (!user) {
      throw new NotFoundError(`User not found: ${userId}`);
    }

    await executor
      .delete(USER_EMAILS)
      .where(
        and(
          eq(USER_EMAILS.userId, UserIds.toUUID(userId)),
          ilike(USER_EMAILS.email, email),
        ),
      );

    // Fire event if not squelched
    if (!options.squelchEvents) {
      await this.events.dispatchEvent({
        __type: "UserEmailRemoved",
        tenantId: this.tenantId,
        userId,
        email,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
