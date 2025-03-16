import { buildStandardLogger } from "@myapp/shared-universal/utils/logging.js";
import {
  buildTemporalConnection,
  TemporalClientService,
} from "@myapp/temporal-client";

import {
  loadBaseConfigFromEnv,
  loadTemporalConfigFromEnv,
} from "../_config/env-loader.js";
import {
  buildNatsClientFromConfig,
  createJetStreamClient,
} from "../lib/datastores/nats/builder.js";
import { loadNatsConfigFromEnv } from "../lib/datastores/nats/config.js";
import { TemporalDispatcher } from "../lib/functional/temporal-dispatcher/index.js";

import { type EventDispatcherRunnerConfig } from "./config.js";
import { dispatchLoop } from "./main.js";

function loadEventDispatchConfigFromEnv(): EventDispatcherRunnerConfig {
  return {
    ...loadBaseConfigFromEnv(),
    ...loadTemporalConfigFromEnv(),
    ...loadNatsConfigFromEnv(),

    dispatch: {
      streamName: "events",
      consumerName: "event-dispatcher",
      maxMessages: 10,
    },
  };
}

export async function runEventDispatcher() {
  const appConfig = loadEventDispatchConfigFromEnv();

  const rootLogger = buildStandardLogger(
    "event-dispatcher",
    appConfig.logLevel,
    {
      prettyPrint: appConfig.prettyLogs,
      useStdout: false,
    },
  );

  const { temporalClient } = await buildTemporalConnection({
    address: appConfig.temporal.address,
    namespace: appConfig.temporal.namespace,
  });

  const temporal = new TemporalClientService(
    rootLogger,
    temporalClient,
    appConfig.temporal.queues,
  );

  const temporalDispatch = new TemporalDispatcher(temporalClient, temporal);

  const natsConnection = await buildNatsClientFromConfig(
    rootLogger,
    appConfig.nats,
  );

  const natsJetstream = await createJetStreamClient(
    rootLogger,
    natsConnection,
    appConfig.nats.domain,
  );

  await dispatchLoop(
    rootLogger,
    appConfig.dispatch,
    temporalClient,
    temporal,
    temporalDispatch,
    natsConnection,
    natsJetstream,
  );
}
