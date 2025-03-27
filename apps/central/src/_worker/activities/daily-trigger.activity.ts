import { activity } from "../activity-helpers.js";

export const doDailyTriggerActivity = activity("doDailyTrigger", {
  fn: async (_context, logger, deps) => {
    logger.info("Triggering the daily-trigger event.");

    const { events } = deps;

    await events.dispatchEvent({
      __type: "DailyTrigger",
    });
  },
});
