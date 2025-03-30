import * as workflow from "@temporalio/workflow";

import { type listTenantIdsActivity } from "../../../../domain/tenants/activities/list-tenant-ids.js";
import { type vacuumUploadsActivity } from "../activities/vacuum-uploads.js";

const { vacuumUploads, listTenantIds } = workflow.proxyActivities<{
  listTenantIds: (typeof listTenantIdsActivity)["activity"];
  vacuumUploads: (typeof vacuumUploadsActivity)["activity"];
}>({
  startToCloseTimeout: "5 minutes",
});

export async function vacuumUploadsWorkflow(): Promise<void> {
  workflow.log.info("Starting upload vacuum workflow");

  const { tenantIds } = await listTenantIds();
  workflow.log.info(`Found ${tenantIds.length} tenants`);

  await Promise.allSettled(
    tenantIds.map((tenantId) => vacuumUploads({ tenantId })),
  );

  workflow.log.info("Completed upload vacuum workflow");
}
