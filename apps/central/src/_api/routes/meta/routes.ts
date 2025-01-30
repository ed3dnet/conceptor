import fp from "fastify-plugin";

import { type AppFastify } from "../../http/type-providers.js";

import { PingResponse } from "./schemas.js";

async function metaRoutes(fastify: AppFastify) {
  fastify.get("/meta/liveness-probe", {
    schema: {
      response: {
        200: PingResponse,
      },
    },
    oas: {
      tags: ["meta"],
      security: [],
    },
    handler: async () => {
      return { pong: true } as const;
    },
  });
}

export const META_ROUTES = fp(metaRoutes, {
  name: "META_ROUTES",
  fastify: ">= 4",
});
