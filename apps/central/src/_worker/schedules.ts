import { type TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import { type CompiledScheduleOptions } from "@temporalio/client";

import { vacuumUploadsWorkflow } from "../lib/functional/images/workflows/vacuum-uploads.js";

export type WorkerSchedule = Omit<
  CompiledScheduleOptions,
  "scheduleId" | "action"
> & {
  action: Omit<CompiledScheduleOptions["action"], "taskQueue"> & {
    taskQueue: keyof TemporalQueueConfig;
  };
};
export const TEMPORAL_SCHEDULED_WORKFLOWS: Record<
  keyof TemporalQueueConfig,
  Record<string, WorkerSchedule | null>
> = {
  core: {
    "one-minute-ping": null,
    // "one-minute-ping": {
    //   action: {
    //     type: "startWorkflow",
    //     workflowId: "ping-1min",
    //     workflowType: ping.name,
    //     taskQueue: "### REPLACE ###",
    //     args: [],
    //   },
    //   spec: {
    //     calendars: [],
    //     intervals: [{ every: ms("1 minute"), offset: 0 }],
    //   },
    // },
  },
  media: {
    "one-minute-ping": null,
    "vacuum-uploads": {
      action: {
        type: "startWorkflow",
        workflowType: vacuumUploadsWorkflow.name,
        workflowId: "vacuum-uploads",
        taskQueue: "media",
        args: [],
      },
      spec: {
        intervals: [{ every: "4 hours", offset: 0 }],
        jitter: "15 minutes",
      },
    },
  },
};
