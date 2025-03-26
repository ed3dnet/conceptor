import { type EventListenersRegistry } from "./event-registry.js";

export const EVENT_LISTENERS: EventListenersRegistry = Object.freeze({
  DailyTrigger: [
    // {
    //   name: "test-listener",
    //   handler: async (p: DailyTriggerEvent) => {
    //     console.log("DailyTriggerEvent", p);
    //   },
    // },
  ],
  HourlyTrigger: [],
});
