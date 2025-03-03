import fp from "fastify-plugin";
import { ulid } from "ulidx";

export const requestIdPlugin = fp(
  async (fastify, opts) => {
    fastify.addHook("onRequest", (request, reply, done) => {
      // @ts-expect-error this is where we set a readonly value
      request.traceId = request.headers["x-trace-id"] ?? ulid();

      request.log = request.log.child({
        traceId: request.traceId,
      });

      reply.header("X-Request-ID", request.id);
      reply.header("X-Trace-ID", request.traceId);
      done();
    });
  },
  { name: "request-id", fastify: ">= 3" },
);
