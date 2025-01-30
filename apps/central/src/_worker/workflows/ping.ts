import * as workflow from "@temporalio/workflow";

import type { doPingActivity } from "../activities/ping.js";

const { doPing } = workflow.proxyActivities<{
  doPing: (typeof doPingActivity)["activity"];
}>({
  scheduleToCloseTimeout: "1 minute",
});

export async function ping(): Promise<string> {
  workflow.log.info("Starting ping workflow.");
  const retval = await doPing();
  workflow.log.info("Workflow says ping!", { retval });

  return retval;
}
