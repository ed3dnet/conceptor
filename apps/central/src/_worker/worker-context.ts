import { type AwilixContainer } from "awilix";
import { type Logger } from "pino";

import { type AppSingletonCradle } from "../_deps/singleton.js";

let _workerLogger: Logger | null = null;
let _container: AwilixContainer<AppSingletonCradle> | null = null;

export function _setWorkerLogger(logger: Logger) {
  if (_workerLogger !== null) {
    throw new Error("Cannot set worker logger twice!");
  }

  _workerLogger = logger;
}

export function getWorkerLogger(): Logger {
  if (_workerLogger === null) {
    throw new Error("Worker logger not set!");
  }

  return _workerLogger;
}

export function _setWorkerDIContainer(
  container: AwilixContainer<AppSingletonCradle>,
) {
  if (_container !== null) {
    throw new Error("Cannot set container twice!");
  }

  _container = container;
}

export function getWorkerDIContainer(): AwilixContainer<AppSingletonCradle> {
  if (_container === null) {
    throw new Error("Container not set!");
  }

  return _container;
}
