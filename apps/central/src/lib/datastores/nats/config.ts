import {
  LogLevel,
  LogLevelChecker,
} from "@myapp/shared-universal/config/types.js";
import { EnsureTypeCheck } from "@myapp/shared-universal/utils/type-utils.js";
import { type Static, Type } from "@sinclair/typebox";

import { getNum, getStr, requireStr } from "../../../_config/env-prefix.js";

export const NatsConfig = Type.Object({
  host: Type.String(),
  port: Type.Number(),
  monitorPort: Type.Number(),

  domain: Type.String(),

  user: Type.Optional(Type.String()),
  password: Type.Optional(Type.String()),

  logLevel: LogLevel,
});
export type NatsConfig = Static<typeof NatsConfig>;

export function loadNatsConfigFromEnv(): {
  nats: NatsConfig;
} {
  return {
    nats: {
      host: requireStr("NATS__HOST"),
      port: getNum("NATS__PORT", 4222),
      monitorPort: getNum("NATS__MONITOR_PORT", 8222),
      domain: requireStr("NATS__DOMAIN"),
      user: getStr("NATS__USER"),
      password: getStr("NATS__PASSWORD"),
      logLevel: EnsureTypeCheck(
        getStr("NATS__LOG_LEVEL", "info"),
        LogLevelChecker,
      ),
    },
  };
}
