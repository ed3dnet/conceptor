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
import { type IdPUserInfo } from "../../domain/employees/schemas.js";
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

export const AUTH_CONNECTORS = pgTable(
  "auth_connectors",
  {
    authConnectorId: ULIDAsUUID().primaryKey(),
    tenantId: uuid()
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
    authConnectorId: uuid()
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

    idpUserInfo: jsonb("idp_user_info").$type<Sensitive<IdPUserInfo>>(),

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

export const EMPLOYEE_SESSIONS = pgTable("employee_sessions", {
  sessionId: ULIDAsUUID().primaryKey(),
  employeeId: uuid()
    .references(() => EMPLOYEES.employeeId)
    .notNull(),
  tenantId: uuid()
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

export const UNIT_TYPE = pgEnum("unit_type", [
  "individual",
  "team",
  "management",
]);

export const UNIT_PERMISSION_TYPE = pgEnum("unit_permission_type", [
  "manage_reports",
  "assign_work",
  "approve_time_off",
  "manage_unit",
  "view_reports",
]);

export const CAPABILITY_PERMISSION_TYPE = pgEnum("capability_permission_type", [
  "view",
  "edit",
  "assign",
  "approve",
  "delete",
]);

export const INITIATIVE_PERMISSION_TYPE = pgEnum("initiative_permission_type", [
  "view",
  "edit",
  "manage_resources",
  "approve_changes",
  "close",
]);

export const GLOBAL_PERMISSION_TYPE = pgEnum("global_permission_type", [
  "admin",
  "audit",
  "create_units",
  "create_initiatives",
  "create_capabilities",
]);

export const INFORMATION_TYPE = pgEnum("information_type", [
  "boolean",
  "gradient",
  "text",
]);

export const UNITS = pgTable(
  "units",
  {
    id: ULIDAsUUID().primaryKey(),
    name: text("name").notNull(),
    type: UNIT_TYPE("type").notNull(),
    parentUnitId: uuid("parent_unit_id").references(
      (): AnyPgColumn => UNITS.id,
    ),

    description: text("description"),
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
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    employeeId: uuid("employee_id")
      .references(() => EMPLOYEES.employeeId)
      .notNull(),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_unit_assignments_unit").on(t.unitId),
    index("idx_unit_assignments_employee").on(t.employeeId),
    index("idx_unit_assignments_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const CAPABILITIES = pgTable("capabilities", {
  id: ULIDAsUUID().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ...TIMESTAMPS_MIXIN,
});

export const INITIATIVES = pgTable(
  "initiatives",
  {
    id: ULIDAsUUID().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const UNIT_CAPABILITIES = pgTable(
  "unit_capabilities",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    capabilityId: uuid("capability_id")
      .references(() => CAPABILITIES.id)
      .notNull(),
    isFormal: boolean("is_formal").notNull().default(false),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_unit_capabilities_unit").on(t.unitId),
    index("idx_unit_capabilities_capability").on(t.capabilityId),
    index("idx_unit_capabilities_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const INITIATIVE_CAPABILITIES = pgTable(
  "initiative_capabilities",
  {
    id: ULIDAsUUID().primaryKey(),
    initiativeId: uuid("initiative_id")
      .references(() => INITIATIVES.id)
      .notNull(),
    capabilityId: uuid("capability_id")
      .references(() => CAPABILITIES.id)
      .notNull(),
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_initiative_capabilities_initiative").on(t.initiativeId),
    index("idx_initiative_capabilities_capability").on(t.capabilityId),
    index("idx_initiative_capabilities_unit").on(t.unitId),
    index("idx_initiative_capabilities_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const UNIT_PERMISSIONS = pgTable(
  "unit_permissions",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    targetUnitId: uuid("target_unit_id")
      .references(() => UNITS.id)
      .notNull(),
    permissionType: UNIT_PERMISSION_TYPE("permission_type").notNull(),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_unit_permissions_unit").on(t.unitId),
    index("idx_unit_permissions_target").on(t.targetUnitId),
    index("idx_unit_permissions_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const CAPABILITY_PERMISSIONS = pgTable(
  "capability_permissions",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    targetCapabilityId: uuid("target_capability_id")
      .references(() => CAPABILITIES.id)
      .notNull(),
    permissionType: CAPABILITY_PERMISSION_TYPE("permission_type").notNull(),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_capability_permissions_unit").on(t.unitId),
    index("idx_capability_permissions_target").on(t.targetCapabilityId),
    index("idx_capability_permissions_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const INITIATIVE_PERMISSIONS = pgTable(
  "initiative_permissions",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    targetInitiativeId: uuid("target_initiative_id")
      .references(() => INITIATIVES.id)
      .notNull(),
    permissionType: INITIATIVE_PERMISSION_TYPE("permission_type").notNull(),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_initiative_permissions_unit").on(t.unitId),
    index("idx_initiative_permissions_target").on(t.targetInitiativeId),
    index("idx_initiative_permissions_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const GLOBAL_PERMISSIONS = pgTable(
  "global_permissions",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    permissionType: GLOBAL_PERMISSION_TYPE("permission_type").notNull(),
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_global_permissions_unit").on(t.unitId),
    index("idx_global_permissions_dates").on(t.startDate, t.endDate),
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const UNIT_INFORMATION = pgTable(
  "unit_information",
  {
    id: ULIDAsUUID().primaryKey(),
    sourceUnitId: uuid("source_unit_id")
      .references(() => UNITS.id)
      .notNull(),
    targetUnitId: uuid("target_unit_id")
      .references(() => UNITS.id)
      .notNull(),
    type: INFORMATION_TYPE("type").notNull(),
    booleanResponse: boolean("boolean_response"),
    gradientResponse: doublePrecision("gradient_response"),
    textResponse: text("text_response"),
    audioSourceBucket: text("audio_source_bucket"),
    audioSourceKey: text("audio_source_key"),
    transcriptionMetadata: jsonb("transcription_metadata"),
    collectedAt: timestamp("collected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    relevanceScore: doublePrecision("relevance_score").notNull().default(1.0),
    manuallyInvalidated: boolean("manually_invalidated")
      .notNull()
      .default(false),
    previousVersionId: uuid("previous_version_id").references(
      (): AnyPgColumn => UNIT_INFORMATION.id,
    ),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    index("idx_unit_information_source").on(t.sourceUnitId),
    index("idx_unit_information_target").on(t.targetUnitId),
    index("idx_unit_information_type").on(t.type),
    index("idx_unit_information_relevance").on(t.relevanceScore),
    index("idx_unit_information_collected").on(t.collectedAt),
    check(
      "valid_response_type",
      sql`
    CASE ${t.type}
      WHEN 'boolean' THEN
        (${t.booleanResponse} IS NOT NULL AND ${t.gradientResponse} IS NULL AND ${t.textResponse} IS NULL)
      WHEN 'gradient' THEN
        (${t.booleanResponse} IS NULL AND ${t.gradientResponse} IS NOT NULL AND ${t.textResponse} IS NULL)
      WHEN 'text' THEN
        (${t.booleanResponse} IS NULL AND ${t.gradientResponse} IS NULL AND ${t.textResponse} IS NOT NULL)
    END
  `,
    ),
    check(
      "valid_audio_source",
      sql`
    (${t.type} != 'text' AND ${t.audioSourceBucket} IS NULL AND ${t.audioSourceKey} IS NULL AND ${t.transcriptionMetadata} IS NULL) OR
    (${t.type} = 'text' AND (
      (${t.audioSourceBucket} IS NULL AND ${t.audioSourceKey} IS NULL) OR
      (${t.audioSourceBucket} IS NOT NULL AND ${t.audioSourceKey} IS NOT NULL)
    ))
  `,
    ),
  ],
);

// // Now implementing the materialized views for current state queries
// export const CURRENT_UNIT_ASSIGNMENTS = pgMaterializedView(
//   "current_unit_assignments",
// ).as((qb) => {
//   return qb
//     .select({
//       unitId: UNIT_ASSIGNMENTS.unitId,
//       employeeId: UNIT_ASSIGNMENTS.employeeId,
//       unitName: UNITS.name,
//       employeeName: EMPLOYEES.displayName,
//       startDate: UNIT_ASSIGNMENTS.startDate,
//     })
//     .from(UNIT_ASSIGNMENTS)
//     .innerJoin(UNITS, eq(UNIT_ASSIGNMENTS.unitId, UNITS.id))
//     .innerJoin(EMPLOYEES, eq(UNIT_ASSIGNMENTS.employeeId, EMPLOYEES.employeeId))
//     .where(isNull(UNIT_ASSIGNMENTS.endDate));
// });

// export const CURRENT_UNIT_CAPABILITIES = pgMaterializedView(
//   "current_unit_capabilities",
// ).as((qb) => {
//   return qb
//     .select({
//       unitId: UNIT_CAPABILITIES.unitId,
//       capabilityId: UNIT_CAPABILITIES.capabilityId,
//       unitName: UNITS.name,
//       capabilityName: CAPABILITIES.name,
//       isFormal: UNIT_CAPABILITIES.isFormal,
//       startDate: UNIT_CAPABILITIES.startDate,
//     })
//     .from(UNIT_CAPABILITIES)
//     .innerJoin(UNITS, eq(UNIT_CAPABILITIES.unitId, UNITS.id))
//     .innerJoin(
//       CAPABILITIES,
//       eq(UNIT_CAPABILITIES.capabilityId, CAPABILITIES.id),
//     )
//     .where(isNull(UNIT_CAPABILITIES.endDate));
// });

// export const CURRENT_INITIATIVE_CAPABILITIES = pgMaterializedView(
//   "current_initiative_capabilities",
// ).as((qb) => {
//   return qb
//     .select({
//       initiativeId: INITIATIVE_CAPABILITIES.initiativeId,
//       capabilityId: INITIATIVE_CAPABILITIES.capabilityId,
//       unitId: INITIATIVE_CAPABILITIES.unitId,
//       initiativeName: INITIATIVES.name,
//       capabilityName: CAPABILITIES.name,
//       unitName: UNITS.name,
//       startDate: INITIATIVE_CAPABILITIES.startDate,
//     })
//     .from(INITIATIVE_CAPABILITIES)
//     .innerJoin(
//       INITIATIVES,
//       eq(INITIATIVE_CAPABILITIES.initiativeId, INITIATIVES.id),
//     )
//     .innerJoin(
//       CAPABILITIES,
//       eq(INITIATIVE_CAPABILITIES.capabilityId, CAPABILITIES.id),
//     )
//     .innerJoin(UNITS, eq(INITIATIVE_CAPABILITIES.unitId, UNITS.id))
//     .where(isNull(INITIATIVE_CAPABILITIES.endDate));
// });

export const UNIT_TAGS = pgTable(
  "unit_tags",
  {
    id: ULIDAsUUID().primaryKey(),
    unitId: uuid("unit_id")
      .references(() => UNITS.id)
      .notNull(),
    key: text("key").notNull(),
    value: text("value"),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [unique("unique_unit_tag").on(t.unitId, t.key)],
);

export const CAPABILITY_TAGS = pgTable(
  "capability_tags",
  {
    id: ULIDAsUUID().primaryKey(),
    capabilityId: uuid("capability_id")
      .references(() => CAPABILITIES.id)
      .notNull(),
    key: text("key").notNull(),
    value: text("value"),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [unique("unique_capability_tag").on(t.capabilityId, t.key)],
);

export const INITIATIVE_TAGS = pgTable(
  "initiative_tags",
  {
    id: ULIDAsUUID().primaryKey(),
    initiativeId: uuid("initiative_id")
      .references(() => INITIATIVES.id)
      .notNull(),
    key: text("key").notNull(),
    value: text("value"),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [unique("unique_initiative_tag").on(t.initiativeId, t.key)],
);

export const EMPLOYEE_TAGS = pgTable(
  "employee_tags",
  {
    id: ULIDAsUUID().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => EMPLOYEES.employeeId)
      .notNull(),
    key: text("key").notNull(),
    value: text("value"),
    ...TIMESTAMPS_MIXIN,
  },
  (t) => [unique("unique_employee_tag").on(t.employeeId, t.key)],
);
