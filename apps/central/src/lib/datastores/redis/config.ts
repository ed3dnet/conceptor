import { type Static, Type } from "@sinclair/typebox";

export const RedisConfig = Type.Object({
  url: Type.String(),
});
export type RedisConfig = Static<typeof RedisConfig>;
