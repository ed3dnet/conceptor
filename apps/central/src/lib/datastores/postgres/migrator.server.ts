import { findUp } from "@eropple/find-up";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { type AppBaseCradleItems } from "../../../_deps/index.js";

export async function doDatabaseMigration(
  deps: AppBaseCradleItems,
): Promise<void> {
  const { logger, db } = deps;

  const packageJson = findUp(import.meta.url, "package.json", {
    searchFor: "files",
  });
  if (!packageJson) {
    throw new Error("Could not find package.json");
  }

  const migrationsDir = packageJson.replace("package.json", "db/migrations");
  logger.info({ migrationsDir }, "Running migrations");
  await migrate(db, {
    migrationsFolder: migrationsDir,
  });
}
