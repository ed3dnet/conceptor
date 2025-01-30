import { asFunction, asValue, type AwilixContainer } from "awilix";
import type { Logger } from "pino";

import { type AppConfig } from "../_config/types.js";

import { type AppBaseCradleItems } from "./singleton.js";

export type AppRequestCradle = AppBaseCradleItems & {};

export async function configureRequestAwilixContainer(
  appConfig: AppConfig,
  requestLogger: Logger,
  baseContainer: AwilixContainer<AppBaseCradleItems>,
): Promise<AwilixContainer<AppRequestCradle>> {
  const container = baseContainer.createScope<AppRequestCradle>();

  container.register({
    config: asValue(appConfig),
    logger: asValue(requestLogger),
  });

  return container;
}
