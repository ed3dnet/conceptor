import fp from "fastify-plugin";

import { ErrorResponse } from "../../http/schemas.js";
import { type AppFastify } from "../../http/type-providers.js";

import {
  HealthErrorResponse,
  HealthResponse,
  PingResponse,
} from "./schemas.js";

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

  fastify.get("/meta/health", {
    schema: {
      description: "Health check endpoint for monitoring system status",
      response: {
        200: HealthResponse,
        503: HealthErrorResponse,
      },
    },
    oas: {
      tags: ["meta"],
      security: [],
    },
    handler: async (req, reply) => {
      try {
        // Get health check results from under-pressure
        const isUnderPressure = fastify.isUnderPressure();

        const response = {
          status: isUnderPressure
            ? ("unhealthy" as const)
            : ("healthy" as const),
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || "unknown",
          environment: fastify.deps().config.env,
          checks: {}, // Individual check results not directly accessible in this API
        };

        if (isUnderPressure) {
          reply.status(503);
        }

        return response;
      } catch (err) {
        fastify.log.error(
          { err, component: "health-check", requestId: req.id },
          "Health check endpoint failed",
        );

        reply.status(503).send({
          error: true,
          code: 503,
          name: "HealthCheckError",
          message: "Health check system is not responding",
          reqId: req.id,
          traceId: req.traceId,
          timestamp: new Date().toISOString(),
        } satisfies HealthErrorResponse);
      }
    },
  });
}

export const META_ROUTES = fp(metaRoutes, {
  name: "META_ROUTES",
  fastify: ">= 4",
});
