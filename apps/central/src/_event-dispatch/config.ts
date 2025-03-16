import { TemporalConfig } from "@myapp/temporal-client/config.js";
import { type Static, Type } from "@sinclair/typebox";

import { BaseConfig, LogLevel } from "../_config/types.js";
import { NatsConfig } from "../lib/datastores/nats/config.js";

export const EventDispatcherConfig = Type.Object({
  streamName: Type.String(),
  consumerName: Type.String(),
  maxMessages: Type.Integer(),
});
export type EventDispatcherConfig = Static<typeof EventDispatcherConfig>;

export const EventDispatcherRunnerConfig = Type.Intersect([
  BaseConfig,
  Type.Object({
    temporal: TemporalConfig,
    nats: NatsConfig,
    dispatch: EventDispatcherConfig,
  }),
]);
export type EventDispatcherRunnerConfig = Static<
  typeof EventDispatcherRunnerConfig
>;
