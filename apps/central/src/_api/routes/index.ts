import fp from "fastify-plugin";

import { type AppFastify } from "../http/type-providers.js";

import { META_ROUTES } from "./meta/routes.js";

async function apiRoutes(fastify: AppFastify) {
  await fastify.register(META_ROUTES);
}
export const API_ROUTES = fp(apiRoutes, {
  name: "API_ROUTES",
  fastify: ">= 4",
});
