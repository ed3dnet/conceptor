import { activity } from "../activity-helpers.js";

export const doPingActivity = activity("doPing", {
  fn: async (_context, logger, deps) => {
    logger.info("Activity pinging...");

    const { dbPool, fetch } = deps;

    const pingResult = await dbPool.query("SELECT 1");

    const response = await fetch("https://google.com");

    logger.info(
      { pingResult: pingResult.rowCount, fetchStatus: response.status },
      "Ping activity did its thing.",
    );

    return "pong";
  },
});
