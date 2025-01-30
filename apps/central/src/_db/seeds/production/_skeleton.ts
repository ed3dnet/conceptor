import { type SeedFn } from "../../../lib/seeder/index.js";

export const seed: SeedFn = async (deps, logger) => {
  logger.info({ file: import.meta.url }, "Seeding.");

  // do seed here
};
