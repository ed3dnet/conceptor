import fp from "fastify-plugin";

export const requestIdPlugin = fp(
  async (fastify, opts) => {
    fastify.addHook("onRequest", (request, reply, done) => {
      reply.header("X-Request-ID", request.id);
      done();
    });
  },
  { name: "request-id", fastify: ">= 3" },
);
