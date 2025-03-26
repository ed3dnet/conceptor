import { Type, type Static, type TObject } from "@sinclair/typebox";

export const DailyTriggerEvent = Type.Object({
  __type: Type.Literal("DailyTrigger"),
});
export type DailyTriggerEvent = Static<typeof DailyTriggerEvent>;

export const HourlyTriggerEvent = Type.Object({
  __type: Type.Literal("HourlyTrigger"),
});
export type HourlyTriggerEvent = Static<typeof HourlyTriggerEvent>;
