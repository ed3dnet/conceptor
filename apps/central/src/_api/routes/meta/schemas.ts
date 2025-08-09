import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

export const PingResponse = schemaType(
  "PingResponse",
  Type.Object({
    pong: Type.Literal(true),
  }),
);
export type PingResponse = Static<typeof PingResponse>;

export const HealthResponse = schemaType(
  "HealthResponse",
  Type.Object({
    status: Type.Union([Type.Literal("healthy"), Type.Literal("unhealthy")]),
    timestamp: Type.String({ format: "date-time" }),
    uptime: Type.Number(),
    version: Type.String(),
    environment: Type.String(),
    checks: Type.Record(Type.String(), Type.Boolean()),
  }),
);
export type HealthResponse = Static<typeof HealthResponse>;

export const HealthErrorResponse = schemaType(
  "HealthErrorResponse",
  Type.Object({
    error: Type.Literal(true),
    code: Type.Number(),
    name: Type.String(),
    message: Type.String(),
    reqId: Type.String(),
    traceId: Type.String(),
    timestamp: Type.String({ format: "date-time" }),
  }),
);
export type HealthErrorResponse = Static<typeof HealthErrorResponse>;
