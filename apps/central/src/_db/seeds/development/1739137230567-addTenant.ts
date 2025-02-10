import { type SeedFn } from "../../../lib/seeder/index.js";

export const seed: SeedFn = async (deps, logger) => {
  logger.info({ file: import.meta.url }, "Seeding.");

  const tenant = await deps.tenants.TX_createTenant({
    tenantId: "00000000-0000-0000-0000-000000000000",
    slug: "demotenant",
    displayName: "My Demo Company",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};
