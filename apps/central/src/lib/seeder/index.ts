import * as Crypto from "node:crypto";
import * as FS from "node:fs/promises";
import * as Path from "node:path";

import type { Logger } from "pino";

import { SEEDS } from "../../_db/schema/app-meta.js";
import { type AppSingletonCradle } from "../../_deps/index.js";

export type SeedFn = (
  deps: AppSingletonCradle,
  logger: Logger,
) => Promise<void>;

export async function seed(environment: string, deps: AppSingletonCradle) {
  const { logger, db } = deps;
  const seedDir = Path.join(
    Path.dirname(new URL(import.meta.url).pathname),
    "../../_db/seeds",
    environment,
  );

  logger.info({ seedDir }, "Starting seeder.");

  // list all seed files in `./seeds`, then create an object with the seed filename
  // as key and the sha256 of the file as the value.
  // this is to ensure that we don't run the same seed twice and that they haven't
  // changed underneath in the database.

  const allFiles = (await FS.readdir(seedDir)).sort((a, b) =>
    a.localeCompare(b),
  );
  logger.debug({ allFileCount: allFiles.length }, "Found seed files.");

  const seedFiles = allFiles.filter(
    (f) => !f.startsWith("_") && f.endsWith(".ts"),
  );
  logger.debug({ rawSeedCount: seedFiles.length }, "Found raw seed files.");

  const prospectiveSeeds = await Promise.all(
    seedFiles.flatMap(async (filename) => {
      const seedFilePath = Path.join(seedDir, filename);
      const seedFileContents = await FS.readFile(seedFilePath);

      logger.debug({ seedFilePath }, "Loading potential seed.");

      const seedModule = await import(`${seedDir}/${filename}`);
      const sha256 = Crypto.createHash("sha256")
        .update(seedFileContents)
        .digest("hex");

      return { filename, sha256, seedModule };
    }),
  );

  logger.debug(
    { seedCount: prospectiveSeeds.length },
    "Found prospective seeds.",
  );
  const existingSeeds = await db.select().from(SEEDS);

  // we need to make sure that the seeds that already exist in the database correctly
  // represent the seed files on disk:

  if (existingSeeds.length > prospectiveSeeds.length) {
    throw new Error(
      `There are more seeds in the database than on disk. This should never happen.`,
    );
  }

  for (const [index, existingSeed] of existingSeeds.entries()) {
    const prospectiveSeed = prospectiveSeeds[index];
    if (!prospectiveSeed) {
      logger.info(`${existingSeed.filename}: is a new seed.`);
      break;
    }

    if (existingSeed.filename !== prospectiveSeed.filename) {
      throw new Error(
        `Seed file mismatch at index ${index}: ${existingSeed.filename} vs ${prospectiveSeed.filename}`,
      );
    }

    if (existingSeed.sha256 !== prospectiveSeed.sha256) {
      throw new Error(
        `Seed file contents mismatch at index ${index}: ${existingSeed.filename} -- ${existingSeed.sha256} vs ${prospectiveSeed.sha256}`,
      );
    }

    logger.info(`${existingSeed.filename}: exists and matches.`);
  }

  // now we need to run any seeds that don't already exist in the database:

  const seedsToRun = prospectiveSeeds.slice(existingSeeds.length);

  for (const seed of seedsToRun) {
    const seedLogger = logger.child({
      phase: "seeding",
      seed: seed.filename,
    });

    const filenameParts = seed.filename.split("-");

    if (filenameParts.length !== 2) {
      seedLogger.error({ filename: seed.filename }, "Invalid seed filename.");
      continue;
    }

    if (
      seed.seedModule.environment === "production" &&
      !filenameParts[1]?.startsWith("PROD")
    ) {
      seedLogger.error(
        { filename: seed.filename },
        "Invalid seed filename; is environment = production but the seed bit of the name doesn't start with PROD.",
      );

      throw new Error("bad seed name, cannot continue.");
    }

    logger.info(`${seed.filename}: seeding...`);

    // const seedModule = require(`${seedDir}/${seed.filename}`);
    await seed.seedModule.seed(deps, seedLogger);
    logger.info(`${seed.filename}: seeded.`);

    const newSeed = (
      await db
        .insert(SEEDS)
        .values({
          filename: seed.filename,
          sha256: seed.sha256,
        })
        .returning({ seedId: SEEDS.seedId })
    )[0];

    if (!newSeed) {
      throw new Error("Failed to insert seed into database.");
    }

    logger.info(
      `${seed.filename}: inserted into database - id ${newSeed.seedId}`,
    );
  }
}
