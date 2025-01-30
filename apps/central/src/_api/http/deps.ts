import { asValue, type AwilixContainer } from "awilix";
import type { DoneFuncWithErrOrRes, FastifyRequest } from "fastify";
import { type Logger } from "pino";

import { type AppConfig } from "../../_config/types.js";
import {
  type AppRequestCradle,
  configureRequestAwilixContainer,
} from "../../_deps/request.js";
import {
  type AppSingletonCradle,
  configureBaseAwilixContainer,
} from "../../_deps/singleton.js";

import type { AppFastify } from "./type-providers.js";

/**
 * Core dependency injection logic for the HTTP server. As a rule:
 *
 * -  request logging should use the request-level diScope entry instead
 *    of Fastify's built-in request.log() method
 * -  datastore connections are registered as singleton-level dependencies
 *    (this may change in the future, especially as our datastore connectors
 *    grow the ability to inject specific logging contexts)
 * -  subsystems are registered as request-level dependencies
 */
export async function registerDependencyInjection(
  config: AppConfig,
  fastify: AppFastify,
  rootContainer: AwilixContainer<AppSingletonCradle>,
) {
  // @ts-expect-error this is where we set a readonly value
  fastify.diContainer = rootContainer;

  fastify.addHook("onRequest", async (request: FastifyRequest, _) => {
    const scope: AwilixContainer<AppRequestCradle> =
      await configureRequestAwilixContainer(
        config,
        request.log as Logger,
        fastify.diContainer,
      );

    // @ts-expect-error this is where we set a readonly value
    request.diScope = scope;
    request.deps = scope.cradle;
  });

  fastify.decorate("deps", () => fastify.diContainer.cradle);
}
