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
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { ulid, ulidToUUID, uuidToULID } from "ulidx";

import { type Sensitive } from "../../domain/vault/schemas.js";

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
