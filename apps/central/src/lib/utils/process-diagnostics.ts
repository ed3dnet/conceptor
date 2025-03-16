/* eslint-disable @typescript-eslint/no-explicit-any */
import * as process from "process";
import * as util from "util";

import type { Logger } from "pino";

/**
 * Logs information about active handles and requests that might be keeping the Node.js process alive
 * @param logger The logger to use for output
 * @param options Configuration options
 * @returns The counts of active handles and requests
 */
export function logActiveProcessResources(
  logger: Logger,
  options: {
    /** Whether to include detailed information about each handle/request */
    detailed?: boolean;
    /** Component name to use in logs */
    component?: string;
  } = {},
): { activeHandles: number; activeRequests: number } {
  const { detailed = true, component = "process_diagnostics" } = options;
  const contextLogger = logger.child({ component });

  // Get active handles
  const activeHandles = (process as any)._getActiveHandles();
  contextLogger.info(`Active handles count: ${activeHandles.length}`);

  if (detailed && activeHandles.length > 0) {
    activeHandles.forEach((handle: any, i: number) => {
      const type = handle?.constructor?.name || "Unknown";
      const details = util.inspect(handle, { depth: 1, colors: false });

      process.stderr.write(`[HANDLE ${i}] Type: ${type}\n`);
      process.stderr.write(`[HANDLE ${i}] Details: ${details}\n\n`);

      contextLogger.info({ index: i, type }, "Active handle found");
    });
  }

  // Get active requests
  const activeRequests = (process as any)._getActiveRequests();
  contextLogger.info(`Active requests count: ${activeRequests.length}`);

  if (detailed && activeRequests.length > 0) {
    activeRequests.forEach((req: any, i: number) => {
      const type = req?.constructor?.name || "Unknown";
      const details = util.inspect(req, { depth: 1, colors: false });

      process.stderr.write(`[REQUEST ${i}] Type: ${type}\n`);
      process.stderr.write(`[REQUEST ${i}] Details: ${details}\n\n`);

      contextLogger.info({ index: i, type }, "Active request found");
    });
  }

  return {
    activeHandles: activeHandles.length,
    activeRequests: activeRequests.length,
  };
}
