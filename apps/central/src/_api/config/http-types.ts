import { LogLevel } from "@myapp/shared-universal/config/types.js";
import { type Static, Type } from "@sinclair/typebox";

export const HttpConfig = Type.Object({
  port: Type.Integer(),
  logLevel: LogLevel,
  emitStackOnErrors: Type.Optional(Type.Boolean()),
});
export type HttpConfig = Static<typeof HttpConfig>;
