import { InsightEvents } from "../insights/events.js";
import { QuestionEvents } from "../questions/events.js";
import { UnitEvents } from "../units/events.js";
import { UserEvents } from "../users/schemas.js";

import { DailyTriggerEvent, HourlyTriggerEvent } from "./event-schemas.js";

// this should break if you add a new event that doesn't have a __type
export const ALL_EVENTS = Object.freeze([
  DailyTriggerEvent,
  HourlyTriggerEvent,

  ...Object.values(UnitEvents),
  ...Object.values(UserEvents),
  ...Object.values(QuestionEvents),
  ...Object.values(InsightEvents),
]);
