import { DefaultLogger, type LogWriter } from "drizzle-orm";
import type { Logger } from "pino";

export class PinoDrizzleLogWriter implements LogWriter {
  constructor(private readonly logger: Logger) {}

  write(message: string): void {
    this.logger.debug(message);
  }
}

export function buildDrizzleLogger(logger: Logger) {
  return new DefaultLogger({
    writer: new PinoDrizzleLogWriter(logger),
  });
}
