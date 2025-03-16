import { type Static, Type } from "@sinclair/typebox";

import { getStr } from "../../../_config/env-prefix.js";
import { EventDispatcherConfig } from "../../../_event-dispatch/config/dispatcher-config.js";

export const EventDispatchConfig = Type.Pick(EventDispatcherConfig, [
  "streamName",
  "consumerName",
]);
export type EventDispatchConfig = Static<typeof EventDispatchConfig>;

export function loadEventDispatchConfigFromEnv(): {
  dispatch: EventDispatchConfig;
} {
  return {
    dispatch: {
      streamName: getStr("DISPATCH__STREAM_NAME", "events"),
      consumerName: getStr("DISPATCH__CONSUMER_NAME", "event-dispatcher"),
    },
  };
}
