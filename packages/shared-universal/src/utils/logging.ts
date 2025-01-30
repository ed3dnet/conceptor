import { pino, type Logger as PinoLogger } from "pino";

import { type LogLevel } from "../config/types.js";

export function buildStandardLogger(
  name: string,
  level: LogLevel,
  opts: {
    useStdout?: boolean;
    prettyPrint?: boolean;
    extraRedactions?: Array<string>;
  } = {},
): PinoLogger {
  const destination = opts.useStdout
    ? pino.destination(1)
    : pino.destination(2);
  const transport = opts.prettyPrint ? { target: "pino-pretty" } : undefined;

  return pino(
    {
      name,
      level,

      redact: {
        remove: true,
        paths: [
          "cookies",
          "headers.authorization",
          `headers.cookie`,
          ...(opts?.extraRedactions ?? []),
        ].map((h) => h.toLowerCase()),
      },

      transport,
    },
    destination,
  );
}

export async function stopwatch<T>(
  logger: PinoLogger,
  metric: string | string[],
  fn: () => Promise<T>,
) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;

  const metricName = typeof metric === "string" ? metric : metric.join(".");

  logger.info({ metric: metricName, duration }, "Stopwatch elapsed.");
  return result;
}

export function loggerWithLevel(
  baseLogger: PinoLogger,
  level: LogLevel,
  childFields: Record<string, unknown>,
) {
  const childLogger = baseLogger.child(childFields);
  childLogger.level = level;
  return childLogger;
}
