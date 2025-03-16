import { connect, type ConnectionOptions, type NatsConnection } from "nats";
import type { Logger } from "pino";

import type { NatsConfig } from "./config.js";

export async function buildNatsClientFromConfig(
  logger: Logger,
  config: NatsConfig,
): Promise<NatsConnection> {
  logger = logger.child({ component: "nats_client" });

  const options: ConnectionOptions = {
    servers: `${config.host}:${config.port}`,
    debug: config.logLevel === "debug",
  };

  // Add authentication if provided
  if (config.user && config.password) {
    options.user = config.user;
    options.pass = config.password;
  }

  logger.info(`Connecting to NATS server at ${config.host}:${config.port}`);

  try {
    const nc = await connect(options);
    logger.info(`Connected to NATS server at ${config.host}:${config.port}`);

    // NATS uses this promise to tell you when the connection has closed. I
    // find it odd.
    nc.closed().then(() => {
      logger.info("NATS connection closed");
    });

    // NATS uses an async iterator for status updates, so we need to use a
    // separate async function. If we tried to `for await` at the top level,
    // we would block and the application would hang.
    (async () => {
      for await (const status of nc.status()) {
        logger.debug(`NATS connection status: ${JSON.stringify(status)}`);
      }
    })().catch((err) => {
      logger.error({ error: err }, "Error processing NATS status updates");
    });

    logger.info("Successfully connected to NATS server");
    return nc;
  } catch (error) {
    logger.error({ error }, "Failed to connect to NATS server");
    throw error;
  }
}

export async function createJetStreamClient(
  logger: Logger,
  natsConnection: NatsConnection,
  domain?: string,
) {
  const loggerWithComponent = logger.child({ component: "nats_jetstream" });

  try {
    const jsOptions = domain ? { domain } : undefined;
    const js = natsConnection.jetstream(jsOptions);

    loggerWithComponent.info(
      domain
        ? `JetStream client created with domain: ${domain}`
        : "JetStream client created",
    );

    return js;
  } catch (error) {
    loggerWithComponent.error({ error }, "Failed to create JetStream client");
    throw error;
  }
}
