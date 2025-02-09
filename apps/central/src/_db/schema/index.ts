import {
  type BaseMessage,
  type SystemMessage,
  type HumanMessage,
  type AIMessage,
  type MessageContent,
} from "@langchain/core/messages";
import cryptoRandomString from "crypto-random-string";
import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { ulid, ulidToUUID, uuidToULID } from "ulidx";

import { type Sensitive } from "../../lib/functional/vault/schemas.js";

// ---------- HELPER TYPES ---------------------- //
export const ULIDAsUUID = (columnName?: string) =>
  (columnName ? uuid(columnName) : uuid()).$default(() => ulidToUUID(ulid()));

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
});

// ------------ IMAGE UPLOADS ------------- //
export const S3_BUCKET_NAME = pgEnum("s3_bucket_name", [
  "core",
  "user-public-content",
  "user-signed-access",
  "upload-staging",
]);

export const IMAGE_RENDITION_FORMAT = pgEnum("image_rendition_format", [
  "fallback",
  "image/webp",
  "image/avif",
]);

export const IMAGE_UPLOADS = pgTable("image_uploads", {
  imageUploadId: ULIDAsUUID().primaryKey(),
  tenantId: uuid()
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
    tenantId: uuid()
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

    imageUploadId: uuid("image_upload_id"),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      imageUploadIdIndex: index("image_upload_id_index").on(t.imageUploadId),
    },
  ],
);

export const LLM_CONNECTOR_NAME = pgEnum("llm_connector_name", ["general"]);

export const LLM_MESSAGE_ROLE = pgEnum("llm_message_role", [
  "system",
  "human",
  "assistant",
]);

export const LLM_CONVERSATIONS = pgTable("llm_conversations", {
  conversationId: ULIDAsUUID().primaryKey(),
  tenantId: uuid()
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
    conversationId: uuid()
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

export const AUTH_CONNECTOR_TYPE = pgEnum("auth_connector_type", [
  "saml",
  "openid",
]);

export const AUTH_CONNECTORS = pgTable(
  "auth_connectors",
  {
    authConnectorId: ULIDAsUUID().primaryKey(),
    tenantId: uuid()
      .references(() => TENANTS.tenantId)
      .notNull(),

    type: AUTH_CONNECTOR_TYPE("type").notNull(),
    name: text("name").notNull(),
    config: jsonb("config")
      .$type<Sensitive<Record<string, unknown>>>()
      .notNull(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      tenantIdx: index("auth_connector_tenant_idx").on(t.tenantId),
    },
  ],
);

// export const SERVICE_ACCOUNTS = pgTable("service_accounts", {
//   serviceAccountId: ULIDAsUUID().primaryKey(),
//   tenantId: uuid()
//     .references(() => TENANTS.tenantId)
//     .notNull(),

//   displayName: text("display_name").notNull(),

//   // argon2 hash of the client secret
//   apiSecret: text("api_secret").notNull(),

//   lastAccessedAt: timestamp("last_accessed_at", {
//     withTimezone: true,
//     mode: "date",
//   }).notNull(),
//   ...TIMESTAMPS_MIXIN,
// });

export const EMPLOYEES = pgTable(
  "employees",
  {
    employeeId: ULIDAsUUID().primaryKey(),
    tenantId: uuid()
      .references(() => TENANTS.tenantId)
      .notNull(),
    connectorId: uuid()
      .references(() => AUTH_CONNECTORS.authConnectorId)
      .notNull(),

    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),

    lastAccessedAt: timestamp("last_accessed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      tenantIdx: index("employee_tenant_idx").on(t.tenantId),
    },
  ],
);

export const EMPLOYEE_SYSTEM_PERMISSIONS = pgTable(
  "employee_system_permissions",
  {
    employeeId: uuid()
      .references(() => EMPLOYEES.employeeId)
      .notNull(),
    permission: text("permission").notNull(),
  },
);

export const EMPLOYEE_EMAILS = pgTable(
  "employee_emails",
  {
    employeeId: uuid()
      .references(() => EMPLOYEES.employeeId)
      .notNull(),
    email: text("email").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      pk: primaryKey({ columns: [t.employeeId, t.email] }),
      employeeIdx: index("employee_emails_employee_idx").on(t.employeeId),
      emailIdx: index("employee_emails_lookup_idx").on(t.email),
      // Ensure email is unique within a tenant (need to join with EMPLOYEES)
      uniqueEmail: unique("employee_emails_tenant_email_unique").on(t.email),
    },
  ],
);

export const EMPLOYEE_EXTERNAL_IDS = pgTable(
  "employee_external_ids",
  {
    employeeId: uuid()
      .references(() => EMPLOYEES.employeeId)
      .notNull(),
    externalIdType: text("external_id_type").notNull(),
    externalId: text("external_id").notNull(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      pk: primaryKey({ columns: [t.employeeId, t.externalIdType] }),
      employeeIdx: index("employee_external_ids_employee_idx").on(t.employeeId),
      lookupIdx: index("employee_external_ids_lookup_idx").on(
        t.externalIdType,
        t.externalId,
      ),
    },
  ],
);
