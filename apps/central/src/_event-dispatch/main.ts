import { type TemporalClientService } from "@myapp/temporal-client";
import { type Client as TemporalClient } from "@temporalio/client";
import {
  AckPolicy,
  NatsError,
  type JetStreamClient,
  type NatsConnection,
} from "nats";
import { type Logger } from "pino";

import { type TemporalDispatcher } from "../lib/functional/temporal-dispatcher/index.js";

import { type EventDispatcherConfig } from "./config.js";

async function prepareJetstream(
  logger: Logger,
  natsConnection: NatsConnection,
  natsJetstream: JetStreamClient,
  dispatchConfig: EventDispatcherConfig,
) {
  try {
    logger = logger.child({ component: "jetstream" });

    const jsm = await natsConnection.jetstreamManager();

    const streamName = dispatchConfig.streamName;
    try {
      await jsm.streams.info(streamName);
      logger.info({ streamName }, `Stream ${streamName} exists`);
    } catch (err) {
      logger.info(
        { streamName },
        `Stream ${streamName} not found, creating it`,
      );
      await jsm.streams.add({
        name: streamName,
        subjects: [`${dispatchConfig.streamName}.>`],
      });
    }

    const consumerName = dispatchConfig.consumerName;
    try {
      await jsm.consumers.info(streamName, consumerName);
      logger.info({ consumerName }, `Consumer ${consumerName} exists`);
    } catch (err) {
      logger.info(
        { consumerName },
        `Consumer ${consumerName} not found, creating it`,
      );
      await jsm.consumers.add(streamName, {
        durable_name: consumerName,
        ack_policy: AckPolicy.Explicit,
      });
    }

    logger.info("Acquiring consumer reference");

    const consumer = await natsJetstream.consumers.get(
      streamName,
      consumerName,
    );

    logger.info("Consumer acquired; good to go.");
    return consumer;
  } catch (err) {
    let cause: Error | undefined;
    let extras: Record<string, unknown> | undefined = undefined;
    if (err instanceof NatsError) {
      cause = err.chainedError;
      extras = {
        apiError: err.api_error,
        permissionContext: err.permissionContext,
      };
    }

    logger.error({ err, cause, extras }, "Error preparing jetstream");
    throw err;
  }
}

export async function dispatchLoop(
  logger: Logger,
  dispatchConfig: EventDispatcherConfig,
  temporalClient: TemporalClient,
  temporal: TemporalClientService,
  temporalDispatch: TemporalDispatcher,
  natsConnection: NatsConnection,
  natsJetstream: JetStreamClient,
): Promise<void> {
  logger = logger.child({ component: "event_dispatcher" });
  logger.info(
    { streamName: dispatchConfig.streamName },
    "Starting event dispatch loop",
  );

  const consumer = await prepareJetstream(
    logger,
    natsConnection,
    natsJetstream,
    dispatchConfig,
  );

  try {
    logger.info("Consumer reference obtained, starting processing loop");

    const messages = await consumer.consume({
      max_messages: dispatchConfig.maxMessages,
    });

    for await (const msg of messages) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(msg.data));
        logger.info(
          {
            subject: msg.subject,
            payload,
          },
          "Received event",
        );

        // Acknowledge the message
        msg.ack();
      } catch (error) {
        logger.error(
          {
            error,
            subject: msg.subject,
          },
          "Error processing message",
        );

        // Negative acknowledge to retry
        msg.nak();
      }
    }

    logger.info("Event dispatch loop initialized");
  } catch (err) {
    let cause: Error | undefined;
    let extras: Record<string, unknown> | undefined = undefined;
    if (err instanceof NatsError) {
      cause = err.chainedError;
      extras = {
        apiError: err.api_error,
        permissionContext: err.permissionContext,
      };
    }

    logger.error({ err, cause, extras }, "Error in the NATS event loop.");
    throw err;
  }
}
