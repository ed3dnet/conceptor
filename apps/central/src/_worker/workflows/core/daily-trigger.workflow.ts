import * as workflow from "@temporalio/workflow";

import { type doDailyTriggerActivity } from "../../activities/daily-trigger.activity.js";

const { doDailyTrigger } = workflow.proxyActivities<{
  doDailyTrigger: (typeof doDailyTriggerActivity)["activity"];
}>({
  scheduleToCloseTimeout: "1 minute",
});

export async function dailyTrigger(): Promise<void> {
  workflow.log.info("Starting daily-trigger workflow.");
  await doDailyTrigger();
  workflow.log.info("Daily trigger event completed successfully.");
}
