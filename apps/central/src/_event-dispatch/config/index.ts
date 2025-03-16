import { TemporalConfig } from "@myapp/temporal-client/config.js";
import { type Static, Type } from "@sinclair/typebox";

import { BaseConfig } from "../../_config/types.js";
import { NatsConfig } from "../../lib/datastores/nats/config.js";

import { EventDispatcherConfig } from "./dispatcher-config.js";

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
