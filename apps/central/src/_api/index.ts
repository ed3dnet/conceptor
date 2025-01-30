import { getCurrentGitCommit } from "@myapp/shared-universal/utils/app-version.js";
import sleep from "sleep-promise";

import { bootstrapNode } from "../lib/bootstrap/init.js";
import { type BootstrapArgs } from "../lib/bootstrap/shared.js";

import { loadApiConfigFromEnvNode } from "./config/env-loader.js";
import { buildServer } from "./http/index.js";

export async function apiMain(args: BootstrapArgs): Promise<void> {
  const { APP_CONFIG, ROOT_CONTAINER, ROOT_LOGGER } = await bootstrapNode(
    "api",
    loadApiConfigFromEnvNode(),
    {
      skipMigrations: args.skipMigrations,
    },
  );

  const server = await buildServer(APP_CONFIG, ROOT_LOGGER, ROOT_CONTAINER);
  const currentCommit = await getCurrentGitCommit();

  server.log.info(
    { currentCommit },
    `Server (release ${currentCommit}) constructed; starting up on port ${APP_CONFIG.http.port}.`,
  );

  const serverAwaiter = server.listen({
    port: APP_CONFIG.http.port,
    host: "0.0.0.0",
  });

  let close: boolean = false;

  const signals = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR2"];
  for (const signal of signals) {
    process.on(signal, () => {
      server.log.info(`Received ${signal}; shutting down.`);
      server.close();
      server.log.info(`Server shut down.`);

      close = true;
    });
  }

  while (!close) {
    await sleep(1000);
  }

  return;
}
