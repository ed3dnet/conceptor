import { type TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import { type CompiledScheduleOptions } from "@temporalio/client";

import { vacuumUploadsWorkflow } from "../lib/functional/images/workflows/vacuum-uploads.js";

import { dailyTrigger } from "./workflows/core/daily-trigger.workflow.js";
import { hourlyTrigger } from "./workflows/core/hourly-trigger.workflow.js";

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
    "daily-trigger": {
      action: {
        type: "startWorkflow",
        workflowId: "daily-trigger-" + Date.now(),
        workflowType: dailyTrigger.name,
        taskQueue: "core",
        args: [],
      },
      spec: {
        intervals: [{ every: "1 day", offset: "1 hour" }],
        jitter: "30 minutes",
      },
    },
    "hourly-trigger": {
      action: {
        type: "startWorkflow",
        workflowId: "hourly-trigger-" + Date.now(),
        workflowType: hourlyTrigger.name,
        taskQueue: "core",
        args: [],
      },
      spec: {
        intervals: [{ every: "1 hour", offset: "5 minutes" }],
        jitter: "5 minutes",
      },
    },
  },
  media: {
    "one-minute-ping": null, // deletes from scheduler
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
