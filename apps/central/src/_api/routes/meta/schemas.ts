import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

export const PingResponse = schemaType(
  "PingResponse",
  Type.Object({
    pong: Type.Literal(true),
  }),
);
export type PingResponse = Static<typeof PingResponse>;
