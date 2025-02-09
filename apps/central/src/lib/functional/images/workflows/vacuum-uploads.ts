import * as workflow from "@temporalio/workflow";

import { type vacuumUploadsActivity } from "../activities/vacuum-uploads.js";

const { vacuumUploads } = workflow.proxyActivities<{
  vacuumUploads: (typeof vacuumUploadsActivity)["activity"];
}>({
  startToCloseTimeout: "5 minutes",
});

export async function vacuumUploadsWorkflow(): Promise<void> {
  workflow.log.info("Starting upload vacuum workflow");
  await vacuumUploads();
  workflow.log.info("Completed upload vacuum workflow");
}
