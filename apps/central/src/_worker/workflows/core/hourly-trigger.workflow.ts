import * as workflow from "@temporalio/workflow";

import { type doHourlyTriggerActivity } from "../../activities/hourly-trigger.activity.js";

const { doHourlyTrigger } = workflow.proxyActivities<{
  doHourlyTrigger: (typeof doHourlyTriggerActivity)["activity"];
}>({
  scheduleToCloseTimeout: "1 minute",
});

export async function hourlyTrigger(): Promise<void> {
  workflow.log.info("Starting hourly-trigger workflow.");
  await doHourlyTrigger();
  workflow.log.info("Hourly trigger event completed successfully.");
}
