import { activity } from "../../../_worker/activity-helpers.js";
import { type TenantId } from "../id.js";

export interface ListTenantIdsActivityOutput {
  tenantIds: TenantId[];
}

export const listTenantIdsActivity = activity("listTenantIds", {
  fn: async (_context, logger, deps): Promise<ListTenantIdsActivityOutput> => {
    logger.debug("entering listTenantIdsActivity");
    const tenants = await deps.tenants.list();
    logger.debug("exiting listTenantIdsActivity");
    return { tenantIds: tenants.map((tenant) => tenant.tenantId) };
  },
});
