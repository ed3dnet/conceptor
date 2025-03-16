import { type Static, Type } from "@sinclair/typebox";

export const EventDispatcherConfig = Type.Object({
  streamName: Type.String(),
  consumerName: Type.String(),
  maxMessages: Type.Integer(),
});
export type EventDispatcherConfig = Static<typeof EventDispatcherConfig>;
