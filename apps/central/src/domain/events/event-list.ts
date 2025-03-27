import { UnitEvents } from "../units/schemas.js";

import { DailyTriggerEvent, HourlyTriggerEvent } from "./event-schemas.js";

// this should break if you add a new event that doesn't have a __type
export const ALL_EVENTS = Object.freeze([
  DailyTriggerEvent,
  HourlyTriggerEvent,

  ...Object.values(UnitEvents),
]);
