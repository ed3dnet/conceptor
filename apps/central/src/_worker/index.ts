import * as Path from "path";

import { getCurrentGitCommit } from "@myapp/shared-universal/utils/app-version.js";
import { type TemporalQueueConfig } from "@myapp/temporal-client/config.js";
import {
  NativeConnection,
  Runtime,
  Worker,
  makeTelemetryFilterString,
} from "@temporalio/worker";

import { bootstrapNode } from "../lib/bootstrap/init.js";

import { ALL_ACTIVITIES } from "./activities/index.js";
import { applySchedules } from "./apply-schedules.js";
import { loadWorkerConfigFromEnvNode } from "./config/env-loader.js";
import { TemporalPinoLogger } from "./logging.js";
import { _setWorkerDIContainer, _setWorkerLogger } from "./worker-context.js";

export async function workerMain(queue: keyof TemporalQueueConfig) {
  const { APP_CONFIG, ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
    `worker-${queue}`,
    loadWorkerConfigFromEnvNode(),
    {
      skipMigrations: true,
    },
  );

  const currentCommit = await getCurrentGitCommit();

  ROOT_LOGGER.info(
    { currentCommit },
    `Worker runner (release ${currentCommit}) starting.`,
  );

  _setWorkerLogger(ROOT_LOGGER);
  _setWorkerDIContainer(ROOT_CONTAINER);

  Runtime.install({
    logger: new TemporalPinoLogger(
      ROOT_LOGGER.child({ context: "temporal-runtime" }),
    ),
    telemetryOptions: {
      logging: {
        forward: {},
        filter: makeTelemetryFilterString({ core: "WARN", other: "WARN" }),
      },
    },
  });

  const nativeConnection = await NativeConnection.connect({
    address: APP_CONFIG.temporal.address,
  });

  const activities = Object.fromEntries(
    ALL_ACTIVITIES.map((a) => a.workerActivityEntry),
  );
  ROOT_LOGGER.info(
    { activityCount: Object.keys(activities).length },
    "Found worker activities.",
  );

  const worker = await Worker.create({
    connection: nativeConnection,

    workflowsPath: `${Path.dirname(new URL(import.meta.url).pathname)}/workflows/${queue}`,
    activities,

    bundlerOptions: {
      ignoreModules: [
        // the dependency injector calls Context but doesn't run in the worker isolate.
        "@temporalio/activity",
      ],
    },
    namespace: APP_CONFIG.temporal.namespace,
    taskQueue: APP_CONFIG.temporal.queues[queue],
    reuseV8Context: true,
  });

  await applySchedules(
    ROOT_LOGGER.child({ context: "applySchedules" }),
    ROOT_CONTAINER.cradle.temporalClient,
    APP_CONFIG.temporal.queues,
    queue,
  );

  ROOT_LOGGER.info("Worker has been constructed; starting up.");
  await worker.run();
  ROOT_LOGGER.info("Worker has finished; exiting workerMain.");
}
