import fp from "fastify-plugin";

import { type AppFastify } from "../http/type-providers.js";

import { AUTH_ROUTES } from "./auth/routes.js";
import { META_ROUTES } from "./meta/routes.js";
import { TENANT_ROUTES } from "./tenants/routes.js";

async function apiRoutes(fastify: AppFastify) {
  await fastify.register(META_ROUTES);
  await fastify.register(AUTH_ROUTES);
  await fastify.register(TENANT_ROUTES);
}
export const API_ROUTES = fp(apiRoutes, {
  name: "API_ROUTES",
  fastify: ">= 4",
});
