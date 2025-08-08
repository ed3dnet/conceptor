import { type MessageContent } from "@langchain/core/messages";
import cryptoRandomString from "crypto-random-string";
import { sql, eq, isNull, type SQL } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgMaterializedView,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { ulid, ulidToUUID, uuidToULID } from "ulidx";

import { type OIDCConnectorState } from "../../domain/auth-connectors/schemas/index.js";
import { type IdPUserInfo } from "../../domain/users/schemas.js";
import { type StringUUID } from "../../lib/ext/typebox/index.js";
import { type TranscriptionOptions } from "../../lib/functional/transcription/schemas.js";
import { type Sensitive } from "../../lib/functional/vault/schemas.js";

// ---------- HELPER TYPES ---------------------- //
export const ULIDAsUUID = (columnName?: string) =>
  (columnName ? uuid(columnName) : uuid())
    .$default(() => ulidToUUID(ulid()))
    .$type<StringUUID>();

// ---------- MIXINS ---------------------- //
export const TIMESTAMPS_MIXIN = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).$onUpdateFn(() => new Date()),
};

export const S3_LOCATOR_MIXIN = {
  bucket: text("bucket").notNull(),
  objectName: text("object_name").notNull(),
};

// ---------------------- USERS ---------------------- //
export const TENANTS = pgTable("tenants", {
  tenantId: ULIDAsUUID().primaryKey(),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),

  extraAttributes: jsonb("extra_attributes")
    .$type<Record<string, unknown>>()
    .notNull()
    .$default(() => ({})),

  ...TIMESTAMPS_MIXIN,
});

// ------------ IMAGE UPLOADS ------------- //
export const S3_BUCKET_NAME = pgEnum("s3_bucket_name", [
  "core",
  "user-content",
  "upload-staging",
]);

export const IMAGE_RENDITION_FORMAT = pgEnum("image_rendition_format", [
  "fallback",
  "image/webp",
  "image/avif",
]);

export const IMAGE_UPLOADS = pgTable("image_uploads", {
  imageUploadId: ULIDAsUUID().primaryKey(),
  tenantId: ULIDAsUUID()
    .references(() => TENANTS.tenantId)
    .notNull(),

  usage: text("usage").notNull(),
  stagingObjectName: text("staging_object_name").notNull(),

  targetBucket: S3_BUCKET_NAME("target_bucket").notNull(),
  targetPath: text("target_path").notNull(),

  completedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  ...TIMESTAMPS_MIXIN,
});

export const IMAGES = pgTable(
  "images",
  {
    imageId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID()
      .references(() => TENANTS.tenantId)
      .notNull(),

    usage: text("usage").notNull(),
    bucket: S3_BUCKET_NAME("bucket").notNull(),
    path: text("path").notNull(),

    blurhash: text("blurhash"),
    readyRenditions: IMAGE_RENDITION_FORMAT("ready_renditions")
      .array()
      .notNull()
      .default([]),

    imageUploadId: ULIDAsUUID("image_upload_id"),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      imageUploadIdIndex: index("image_upload_id_index").on(t.imageUploadId),
    },
  ],
);

export const LLM_CONNECTOR_NAME = pgEnum("llm_connector_name", [
  "general",
  "shortSummarization",
]);

export const LLM_MESSAGE_ROLE = pgEnum("llm_message_role", [
  "system",
  "human",
  "assistant",
]);

export const LLM_CONVERSATIONS = pgTable("llm_conversations", {
  conversationId: ULIDAsUUID().primaryKey(),
  tenantId: ULIDAsUUID()
    .references(() => TENANTS.tenantId)
    .notNull(),

  connectorName: LLM_CONNECTOR_NAME("connector_name").notNull(),
  modelOptions: jsonb("model_options")
    .$type<Record<string, unknown>>()
    .notNull(),

  purpose: text("purpose"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  ...TIMESTAMPS_MIXIN,
});

export const LLM_CONVERSATION_MESSAGES = pgTable(
  "llm_conversation_messages",
  {
    messageId: ULIDAsUUID().primaryKey(),
    conversationId: ULIDAsUUID()
      .references(() => LLM_CONVERSATIONS.conversationId)
      .notNull(),

    role: LLM_MESSAGE_ROLE("role").notNull(),
    content: jsonb("content").$type<Sensitive<MessageContent>>().notNull(),

    orderIndex: integer("order_index").notNull(),
    tokenCount: integer("token_count"),

    // Non-sensitive metadata from the LLM response
    response_metadata:
      jsonb("response_metadata").$type<Record<string, unknown>>(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      conversationOrder: index(
        "llm_conversation_messages_conversation_order_idx",
      ).on(t.conversationId, t.orderIndex),
    },
  ],
);

export const TRANSCRIPTION_JOB_STATUS = pgEnum("transcription_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const TRANSCRIPTION_JOBS = pgTable("transcription_jobs", {
  transcriptionJobId: ULIDAsUUID().primaryKey(),
  tenantId: ULIDAsUUID()
    .references(() => TENANTS.tenantId)
    .notNull(),

  sourceBucket: S3_BUCKET_NAME("source_bucket").notNull(),
  sourceObjectName: text("source_object_name").notNull(),

  options: jsonb("options").$type<TranscriptionOptions>().notNull(),

  status: TRANSCRIPTION_JOB_STATUS("status").notNull().default("pending"),
  errorMessage: text("error_message"),

  transcriptionText: text("transcription_text"),
  transcriptionMetadata: jsonb("transcription_metadata"),

  ...TIMESTAMPS_MIXIN,
});

export const AUTH_CONNECTORS = pgTable(
  "auth_connectors",
  {
    authConnectorId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID()
      .references(() => TENANTS.tenantId)
      .notNull(),

    name: text("name").notNull(),
    state: jsonb("state").$type<Sensitive<OIDCConnectorState>>().notNull(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      tenantIdx: index("auth_connector_tenant_idx").on(t.tenantId),
    },
  ],
);

export const AUTH_CONNECTOR_DOMAINS = pgTable(
  "auth_connector_domains",
  {
    authConnectorId: ULIDAsUUID()
      .references(() => AUTH_CONNECTORS.authConnectorId)
      .notNull(),
    domain: text("domain").notNull(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      pk: primaryKey({ columns: [t.authConnectorId, t.domain] }),
      domainIdx: index("auth_connector_domains_domain_idx").on(t.domain),
    },
  ],
);

export const USERS = pgTable(
  "users",
  {
    userId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID()
      .references(() => TENANTS.tenantId)
      .notNull(),
    connectorId: ULIDAsUUID()
      .references(() => AUTH_CONNECTORS.authConnectorId)
      .notNull(),

    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),

    idpUserInfo: jsonb("idp_user_info").$type<Sensitive<IdPUserInfo>>(),
    disabledAt: timestamp("disabled_at", {
      withTimezone: true,
      mode: "date",
    }),

    lastAccessedAt: timestamp("last_accessed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),

    extraAttributes: jsonb("extra_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .$default(() => ({})),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      tenantIdx: index("user_tenant_idx").on(t.tenantId),
    },
  ],
);

export const USER_SESSIONS = pgTable("user_sessions", {
  sessionId: ULIDAsUUID().primaryKey(),
  userId: ULIDAsUUID()
    .references(() => USERS.userId)
    .notNull(),
  tenantId: ULIDAsUUID()
    .references(() => TENANTS.tenantId)
    .notNull(),

  tokenHash: text("token_hash").notNull().unique(),
  revokedAt: timestamp("revoked_at", {
    withTimezone: true,
    mode: "date",
  }),

  lastAccessedAt: timestamp("last_accessed_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
});

export const USER_SYSTEM_PERMISSIONS = pgTable("user_system_permissions", {
  userId: ULIDAsUUID()
    .references(() => USERS.userId)
    .notNull(),
  permission: text("permission").notNull(),
});

export const USER_EMAILS = pgTable(
  "user_emails",
  {
    userId: ULIDAsUUID()
      .references(() => USERS.userId)
      .notNull(),
    email: text("email").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      pk: primaryKey({ columns: [t.userId, t.email] }),
      userIdx: index("user_emails_user_idx").on(t.userId),
      emailIdx: index("user_emails_lookup_idx").on(t.email),
      // Ensure email is unique within a tenant (need to join with USERS)
      uniqueEmail: unique("user_emails_tenant_email_unique").on(t.email),
    },
  ],
);

export const USER_EXTERNAL_IDS = pgTable(
  "user_external_ids",
  {
    userId: ULIDAsUUID()
      .references(() => USERS.userId)
      .notNull(),
    externalIdKind: text("external_id_kind").notNull(),
    externalId: text("external_id").notNull(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      pk: primaryKey({ columns: [t.userId, t.externalIdKind] }),
      userIdx: index("user_external_ids_user_idx").on(t.userId),
      lookupIdx: index("user_external_ids_lookup_idx").on(
        t.externalIdKind,
        t.externalId,
      ),
    },
  ],
);

export const UNIT_KIND = pgEnum("unit_kind", ["individual", "organizational"]);

export const UNITS = pgTable(
  "units",
  {
    id: ULIDAsUUID().primaryKey(),
    name: text("name").notNull(),
    type: UNIT_KIND("type").notNull(),
    parentUnitId: ULIDAsUUID("parent_unit_id").references(
      (): AnyPgColumn => UNITS.id,
    ),

    description: text("description")
      .notNull()
      .$default(() => "No description given."),

    extraAttributes: jsonb("extra_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .$default(() => ({})),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_units_parent").on(t.parentUnitId),
    check("valid_parent", sql`${t.id} != ${t.parentUnitId}`),
  ],
);

export const UNIT_ASSIGNMENTS = pgTable(
  "unit_assignments",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: ULIDAsUUID("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    userId: ULIDAsUUID()
      .references(() => USERS.userId)
      .notNull(),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),

    extraAttributes: jsonb("extra_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .$default(() => ({})),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_unit_assignments_unit").on(t.unitId),
    index("idx_unit_assignments_user").on(t.userId),
    index("idx_unit_assignments_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const USER_TAGS = pgTable(
  "user_tags",
  {
    id: ULIDAsUUID().primaryKey(),
    userId: ULIDAsUUID()
      .references(() => USERS.userId)
      .notNull(),
    key: text("key").notNull(),
    value: text("value"),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [unique("unique_user_tag").on(t.userId, t.key)],
);

export const UNIT_TAGS = pgTable(
  "unit_tags",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: ULIDAsUUID("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    key: text("key").notNull(),
    value: text("value"),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [unique("unique_unit_tag").on(t.unitId, t.key)],
);
