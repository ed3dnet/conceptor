import { type Static, Type } from "@sinclair/typebox";

export const TemporalQueueConfig = Type.Object({
  core: Type.String(),
  media: Type.String(),
});
export type TemporalQueueConfig = Static<typeof TemporalQueueConfig>;
export type TemporalQueueName = keyof TemporalQueueConfig;

export const TemporalConfig = Type.Object({
  address: Type.String(),
  queues: TemporalQueueConfig,
  namespace: Type.String(),
});
export type TemporalConfig = Static<typeof TemporalConfig>;
