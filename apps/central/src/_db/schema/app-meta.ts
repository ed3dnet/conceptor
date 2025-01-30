import { pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

// #region Seed DB Types
export const appMetaSchema = pgSchema("app_meta");

export const SEEDS = appMetaSchema.table("seeds", {
  seedId: uuid().primaryKey().defaultRandom(),
  filename: text().notNull().unique(),
  sha256: text().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

// #endregion
