import { activity } from "../activity-helpers.js";

export const doHourlyTriggerActivity = activity("doHourlyTrigger", {
  fn: async (_context, logger, deps) => {
    logger.info("Triggering the hourly-trigger event.");

    const { events } = deps;

    await events.dispatchEvent({
      __type: "HourlyTrigger",
    });
  },
});
