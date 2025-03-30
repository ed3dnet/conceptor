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
import {
  type AskResponseData,
  type AskQuery,
} from "../../domain/questions/schemas/index.js";
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
    unitId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID("tenant_id").notNull(),
    name: text("name").notNull(),
    type: UNIT_KIND("type").notNull(),
    parentUnitId: ULIDAsUUID("parent_unit_id").references(
      (): AnyPgColumn => UNITS.unitId,
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
    check("valid_parent", sql`${t.unitId} != ${t.parentUnitId}`),
  ],
);

export const UNIT_ANCESTRY = pgTable(
  "unit_ancestry",
  {
    unitId: ULIDAsUUID("unit_id")
      .references(() => UNITS.unitId)
      .notNull(),
    ancestorUnitId: ULIDAsUUID("ancestor_unit_id").references(
      () => UNITS.unitId,
    ),
    distance: integer("distance").notNull(),
  },
  (t) => [
    index("idx_unit_ancestry_unit").on(t.unitId),
    index("idx_unit_ancestry_ancestor").on(t.ancestorUnitId),
  ],
);

export const UNIT_ASSIGNMENTS = pgTable(
  "unit_assignments",
  {
    unitAssignmentId: ULIDAsUUID().primaryKey(),
    unitId: ULIDAsUUID("unit_id")
      .references(() => UNITS.unitId)
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

export const CAPABILITIES = pgTable("capabilities", {
  capabilityId: ULIDAsUUID().primaryKey(),
  tenantId: ULIDAsUUID("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),

  extraAttributes: jsonb("extra_attributes")
    .$type<Record<string, unknown>>()
    .notNull()
    .$default(() => ({})),

  ...TIMESTAMPS_MIXIN,
});

export const INITIATIVES = pgTable(
  "initiatives",
  {
    initiativeId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID("tenant_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
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
    check(
      "valid_dates",
      sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`,
    ),
  ],
);

export const UNIT_CAPABILITIES = pgTable(
  "unit_capabilities",
  {
    unitCapabilityId: ULIDAsUUID().primaryKey(),
    unitId: ULIDAsUUID("unit_id")
      .references(() => UNITS.unitId)
      .notNull(),
    capabilityId: ULIDAsUUID("capability_id")
      .references(() => CAPABILITIES.capabilityId)
      .notNull(),
    isFormal: boolean("is_formal").notNull().default(false),
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
    initiativeCapabilityId: ULIDAsUUID().primaryKey(),
    initiativeId: ULIDAsUUID("initiative_id")
      .references(() => INITIATIVES.initiativeId)
      .notNull(),
    capabilityId: ULIDAsUUID("capability_id")
      .references(() => CAPABILITIES.capabilityId)
      .notNull(),
    unitId: ULIDAsUUID("unit_id")
      .references(() => UNITS.unitId)
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

export const USER_TAGS = pgTable(
  "user_tags",
  {
    userTagId: ULIDAsUUID().primaryKey(),
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
    unitTagId: ULIDAsUUID().primaryKey(),
    unitId: ULIDAsUUID("unit_id")
      .references(() => UNITS.unitId)
      .notNull(),
    key: text("key").notNull(),
    value: text("value"),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [unique("unique_unit_tag").on(t.unitId, t.key)],
);

// ----------------------------------------------------------------------------
// ASKS AND ANSWERS
// ----------------------------------------------------------------------------

export const ASK_VISIBILITY = pgEnum("ask_visibility", [
  "private",
  "derive-only",
  "upward",
  "downward",
  "public",
]);

export const MULTIPLE_ANSWER_STRATEGY = pgEnum("multiple_answer_strategy", [
  "disallow",
  "remember-last",
]);

export const REFERENCE_DIRECTION = pgEnum("reference_direction", [
  "subject",
  "object",
]);

// Add these table definitions with the other table definitions
export const ASKS = pgTable(
  "asks",
  {
    askId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID()
      .references(() => TENANTS.tenantId)
      .notNull(),

    hardcodeKind: text("hardcode_kind"),
    sourceAgentName: text("source_agent_name"),
    notifySourceAgent: boolean("notify_source_agent"),

    query: jsonb("query").$type<AskQuery>().notNull(),
    visibility: ASK_VISIBILITY("visibility").notNull(),
    multipleAnswerStrategy: MULTIPLE_ANSWER_STRATEGY(
      "multiple_answer_strategy",
    ).notNull(),

    extraAttributes: jsonb("extra_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .$default(() => ({})),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      tenantIdx: index("ask_tenant_idx").on(t.tenantId),
    },
  ],
);

export const ASK_REFERENCES = pgTable(
  "ask_references",
  {
    askReferenceId: ULIDAsUUID().primaryKey(),
    askId: ULIDAsUUID("ask_id")
      .references(() => ASKS.askId)
      .notNull(),

    referenceDirection: REFERENCE_DIRECTION("reference_direction").notNull(),

    unitId: ULIDAsUUID("unit_id").references(() => UNITS.unitId),
    initiativeId: ULIDAsUUID("initiative_id").references(
      () => INITIATIVES.initiativeId,
    ),
    capabilityId: ULIDAsUUID("capability_id").references(
      () => CAPABILITIES.capabilityId,
    ),
    answerId: ULIDAsUUID("answer_id").references(() => ANSWERS.answerId),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      askIdx: index("ask_references_ask_idx").on(t.askId),
      unitIdx: index("ask_references_unit_idx").on(t.unitId),
      initiativeIdx: index("ask_references_initiative_idx").on(t.initiativeId),
      capabilityIdx: index("ask_references_capability_idx").on(t.capabilityId),
      answerId: index("ask_references_answer_idx").on(t.answerId),
    },
    check(
      "one_reference_target",
      sql`(
        (${t.unitId} IS NOT NULL)::integer +
        (${t.initiativeId} IS NOT NULL)::integer +
        (${t.capabilityId} IS NOT NULL)::integer +
        (${t.answerId} IS NOT NULL)::integer
      ) = 1`,
    ),
  ],
);

export const ASK_RESPONSES = pgTable(
  "ask_responses",
  {
    askResponseId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID()
      .references(() => TENANTS.tenantId)
      .notNull(),
    askId: ULIDAsUUID("ask_id")
      .references(() => ASKS.askId)
      .notNull(),
    userId: ULIDAsUUID("user_id")
      .references(() => USERS.userId)
      .notNull(),

    response: jsonb("response").$type<AskResponseData>().notNull(),

    extraAttributes: jsonb("extra_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .$default(() => ({})),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      askIdx: index("ask_responses_ask_idx").on(t.askId),
      userIdx: index("ask_responses_user_idx").on(t.userId),
    },
  ],
);

export const ANSWERS = pgTable(
  "answers",
  {
    answerId: ULIDAsUUID().primaryKey(),
    tenantId: ULIDAsUUID()
      .references(() => TENANTS.tenantId)
      .notNull(),
    askResponseId: ULIDAsUUID("ask_response_id")
      .references(() => ASK_RESPONSES.askResponseId)
      .notNull(),

    text: text("text").notNull(),

    extraAttributes: jsonb("extra_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .$default(() => ({})),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => [
    {
      responseIdx: index("answers_response_idx").on(t.askResponseId),
    },
  ],
);
