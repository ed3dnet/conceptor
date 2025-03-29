import { asFunction, asValue, type AwilixContainer } from "awilix";
import { type FastifyRequest } from "fastify";
import type { Logger } from "pino";

import { type AppConfig } from "../_config/types.js";

import { type AppSingletonCradle } from "./singleton.js";

export type AppRequestCradle = AppSingletonCradle & {
  request: FastifyRequest;
};

export async function configureRequestAwilixContainer(
  appConfig: AppConfig,
  request: FastifyRequest,
  baseContainer: AwilixContainer<AppSingletonCradle>,
): Promise<AwilixContainer<AppRequestCradle>> {
  const container = baseContainer.createScope<AppRequestCradle>();

  container.register({
    config: asValue(appConfig),
    request: asValue(request),
    logger: asValue(request.log as Logger), // Fastify uses Pino internally so it's cool
  });

  return container;
}
