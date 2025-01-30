import { type Logger as TemporalLogger } from "@temporalio/worker";
import { type Logger } from "pino";

export class TemporalPinoLogger implements TemporalLogger {
  constructor(public readonly logger: Logger) {}

  debug(message: string, meta?: object) {
    this.logger.debug(meta, message);
  }

  error(message: string, meta?: object) {
    this.logger.error(meta, message);
  }

  info(message: string, meta?: object) {
    this.logger.info(meta, message);
  }

  trace(message: string, meta?: object) {
    this.logger.trace(meta, message);
  }

  warn(message: string, meta?: object) {
    this.logger.warn(meta, message);
  }

  log(level: string, message: string, meta?: object) {
    switch (level) {
      case "DEBUG":
        this.logger.debug(meta, message);
        break;
      case "ERROR":
        this.logger.error(meta, message);
        break;
      case "INFO":
        this.logger.info(meta, message);
        break;
      case "TRACE":
        this.logger.trace(meta, message);
        break;
      case "WARN":
        this.logger.warn(meta, message);
        break;
    }
  }
}
