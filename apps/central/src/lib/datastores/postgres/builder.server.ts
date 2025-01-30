import pg from "pg";
import type { Logger } from "pino";

import type { PostgresHostConfig } from "./config.server.js";

export function buildDbPoolFromConfig(
  name: string,
  logger: Logger,
  hostConfig: PostgresHostConfig,
) {
  let poolLoggerFn: pg.PoolConfig["log"] = undefined;
  if (hostConfig.logLevel !== "silent") {
    logger = logger.child({ component: `pg_${name}` });

    logger.level = hostConfig.logLevel;

    poolLoggerFn = (...messages: unknown[]) => {
      for (const msg of messages) {
        logger.debug(msg);
      }
    };
  }

  return new pg.Pool({
    ...hostConfig,
    application_name: `pg_${name}`,
    log: poolLoggerFn,
  });
}
