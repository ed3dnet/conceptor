import { asFunction, asValue, type AwilixContainer } from "awilix";
import type { Logger } from "pino";

import { type AppConfig } from "../_config/types.js";

import { type AppBaseCradleItems } from "./singleton.js";

export type AppActivityCradle = AppBaseCradleItems & {};

export async function configureActivityAwilixContainer(
  appConfig: AppConfig,
  requestLogger: Logger,
  baseContainer: AwilixContainer<AppBaseCradleItems>,
): Promise<AwilixContainer<AppActivityCradle>> {
  const container = baseContainer.createScope<AppActivityCradle>();

  container.register({
    config: asValue(appConfig),
    logger: asValue(requestLogger),
  });

  return container;
}
