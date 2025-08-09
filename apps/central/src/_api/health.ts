import underPressure from "@fastify/under-pressure";
import {
  type FastifyPluginAsync,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";
import fp from "fastify-plugin";

import type { RootContainer } from "./http/type-extensions.js";
import type { AppFastify } from "./http/type-providers.js";

/**
 * Health check plugin that integrates with @fastify/under-pressure to monitor
 * system health including database connections, Redis, Temporal, and other services.
 */
export const healthPlugin: FastifyPluginAsync<{
  container: RootContainer;
}> = fp(
  async (fastify: AppFastify, { container }: { container: RootContainer }) => {
    const deps = container.cradle;

    // Register the @fastify/under-pressure plugin with custom health checks
    await fastify.register(underPressure, {
      // System resource limits with configurable thresholds (sane defaults)
      maxEventLoopDelay: deps.config.health?.maxEventLoopDelayMs || 1000, // 1 second default
      maxHeapUsedBytes: (deps.config.health?.maxHeapMB || 1024) * 1024 * 1024, // 1GB default
      maxRssBytes: (deps.config.health?.maxRssMB || 1536) * 1024 * 1024, // 1.5GB default

      // Custom health check function for external services
      healthCheck: async (fastify) => {
        // Define individual health check functions
        const healthCheckFunctions: Array<{
          name: string;
          check: (
            fastify: AppFastify,
            container: RootContainer,
          ) => Promise<boolean>;
        }> = [
          {
            name: "readonlyDatabase",
            check: async (fastify, container) => {
              await container.cradle.dbRO.execute(`SELECT 1 as health_check`);
              return true;
            },
          },
          {
            name: "readwriteDatabase",
            check: async (fastify, container) => {
              await container.cradle.db.execute(`SELECT 1 as health_check`);
              return true;
            },
          },
          {
            name: "redisConnection",
            check: async (fastify, container) => {
              const result = await container.cradle.redis.ping();
              return result === "PONG";
            },
          },
          {
            name: "temporalClient",
            check: async (fastify, container) => {
              await container.cradle.temporalClient.workflowService.getSystemInfo(
                {},
              );
              return true;
            },
          },
        ];

        // Execute all health checks with Promise.allSettled
        const results = await Promise.allSettled(
          healthCheckFunctions.map(async ({ name, check }) => ({
            name,
            result: await check(fastify, container),
          })),
        );

        // Process results and create checks object
        const checks: Record<string, boolean> = {};

        results.forEach((result, index) => {
          const checkName = healthCheckFunctions[index]?.name;
          if (!checkName) return;

          if (result.status === "fulfilled") {
            checks[checkName] = result.value.result;
          } else {
            fastify.log.error(
              { error: result.reason, component: "health-check", checkName },
              `${checkName} health check failed`,
            );
            checks[checkName] = false;
          }
        });

        return checks;
      },

      // Custom handler for when server is under pressure
      pressureHandler: (req: FastifyRequest, reply: FastifyReply) => {
        fastify.log.warn(
          { component: "health-check", requestId: req.id },
          "Server is under pressure - returning 503",
        );

        reply.status(503).send({
          error: true,
          code: 503,
          name: "ServiceUnavailableError",
          message: "Server is temporarily unavailable due to high load",
          reqId: req.id,
          traceId: req.traceId,
        });
      },

      // Expose metrics endpoint (disabled in production for security)
      exposeStatusRoute: deps.config.env !== "production",
    });

    fastify.log.info(
      { component: "health-check" },
      "Health check plugin registered with external service monitoring",
    );
  },
  {
    name: "health-plugin",
    fastify: ">= 5",
  },
);
