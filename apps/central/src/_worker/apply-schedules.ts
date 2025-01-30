import { type TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import {
  type Client,
  type CompiledScheduleOptions,
  type ScheduleHandle,
} from "@temporalio/client";
import { type Logger } from "pino";

import {
  TEMPORAL_SCHEDULED_WORKFLOWS,
  type WorkerSchedule,
} from "./schedules.js";

type ScheduleWithoutScheduleId = Omit<CompiledScheduleOptions, "scheduleId">;

export async function applySchedules(
  logger: Logger,
  temporalClient: Client,
  config: TemporalQueueConfig,
  taskQueueName: keyof TemporalQueueConfig,
) {
  logger.info({ taskQueueName }, "Applying schedules to Temporal.");

  const toCreate: Array<CompiledScheduleOptions> = [];
  const toUpdate: Array<[ScheduleHandle, ScheduleWithoutScheduleId]> = [];
  const toDelete: Array<ScheduleHandle> = [];

  const schedule = TEMPORAL_SCHEDULED_WORKFLOWS[taskQueueName];

  for (const [scheduleId, inputScheduleInfo] of Object.entries(schedule)) {
    logger.debug({ scheduleId }, "Checking schedule's existence in Temporal.");

    const scheduleInfo: ScheduleWithoutScheduleId | null =
      inputScheduleInfo === null
        ? null
        : {
            ...inputScheduleInfo,
            action: {
              ...inputScheduleInfo.action,
              taskQueue: config[taskQueueName],
            },
          };

    const handle = await temporalClient.schedule.getHandle(scheduleId);
    try {
      const description = await handle.describe();
      if (scheduleInfo === null) {
        logger.info({ scheduleId }, "Schedule exists, deleting.");
        toDelete.push(handle);
        continue;
      }
    } catch (err) {
      if (scheduleInfo !== null) {
        logger.info({ scheduleId }, "Schedule does not exist, creating.");
        toCreate.push({ ...scheduleInfo, scheduleId });
      } else {
        logger.debug(
          { scheduleId },
          "Schedule does not exist, nothing to delete.",
        );
      }
      continue;
    }

    toUpdate.push([handle, scheduleInfo]);
  }

  logger.debug(`Creating ${toCreate.length} schedules.`);
  for (const handle of toDelete) {
    logger.debug({ scheduleId: handle.scheduleId }, "Deleting schedule.");
    await handle.delete();
    logger.info({ scheduleId: handle.scheduleId }, "Deleted schedule.");
  }

  logger.debug(`Updating ${toUpdate.length} schedules.`);
  for (const [handle, schedule] of toUpdate) {
    logger.debug({ scheduleId: handle.scheduleId }, "Updating schedule.");
    await handle.update((current) => ({ ...current, ...schedule }));
    logger.info({ scheduleId: handle.scheduleId }, "Updated schedule.");
  }

  logger.debug(`Creating ${toCreate.length} schedules.`);
  for (const schedule of toCreate) {
    logger.debug({ scheduleId: schedule.scheduleId }, "Creating schedule.");
    await temporalClient.schedule.create(schedule);
    logger.info({ scheduleId: schedule.scheduleId }, "Created schedule.");
  }
}
