import {
  loggedFetch,
  type FetchFn,
} from "@myapp/shared-universal/utils/fetch.js";
import { loggerWithLevel } from "@myapp/shared-universal/utils/logging.js";
import {
  initializeZxcvbn,
  type Zxcvbn,
  zxcvbn,
} from "@myapp/shared-universal/utils/zxcvbn.js";
import {
  buildTemporalConnection,
  type TemporalClient,
  TemporalClientService,
} from "@myapp/temporal-client";
import {
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
} from "awilix";
import { drizzle } from "drizzle-orm/node-postgres";
import { Redis } from "ioredis";
import type Mail from "nodemailer/lib/mailer/index.js";
import type * as pg from "pg";
import type { Logger } from "pino";
import type { StaleWhileRevalidate } from "stale-while-revalidate-cache";
import type { DeepReadonly } from "utility-types";

import { type AppConfig } from "../_config/types.js";
import { AuthService } from "../domain/auth/service.js";
import { AuthConnectorService } from "../domain/auth-connectors/service.js";
import { TenantService } from "../domain/tenants/service.js";
import { UserService } from "../domain/users/service.js";
import { buildMemorySwrCache } from "../lib/datastores/memory-swr.js";
import { buildDbPoolFromConfig } from "../lib/datastores/postgres/builder.server.js";
import { buildDrizzleLogger } from "../lib/datastores/postgres/query-logger.server.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../lib/datastores/postgres/types.server.js";
import { buildRedisSWRCache } from "../lib/datastores/redis/swr.js";
import { createMailTransport } from "../lib/functional/email-delivery/factory.js";
import { ImagesService } from "../lib/functional/images/service.js";
import { LlmPrompterService } from "../lib/functional/llm-prompter/service.js";
import {
  buildMinioClient,
  ObjectStoreService,
  type MinioClient,
} from "../lib/functional/object-store/service.js";
import { TemporalDispatcher } from "../lib/functional/temporal-dispatcher/index.js";
import { VaultKeyStore } from "../lib/functional/vault/keystore.js";
import { VaultService } from "../lib/functional/vault/service.js";

// eslint-disable-next-line no-restricted-globals
const globalFetch = fetch;

export type AppBaseCradleItems = {
  config: DeepReadonly<AppConfig>;
  logger: Logger;
  fetch: FetchFn;

  dbROPool: pg.Pool;
  dbPool: pg.Pool;

  dbRO: DrizzleRO;
  db: Drizzle;

  redis: Redis;
  redisSWR: StaleWhileRevalidate;
  memorySWR: StaleWhileRevalidate;

  zxcvbn: Zxcvbn;

  // lib and framework objects
  temporalClient: TemporalClient;
  temporal: TemporalClientService;
  temporalDispatch: TemporalDispatcher;
  mailTransport: Mail;
  _minio: MinioClient;
  s3: ObjectStoreService;
  vaultKeyStore: VaultKeyStore;
  vault: VaultService;
  images: ImagesService;
  llmPrompter: LlmPrompterService;

  // domain objects below here
  tenants: TenantService;
  auth: AuthService;
  authConnectors: AuthConnectorService;
  users: UserService;
};
export type AppSingletonCradle = AppBaseCradleItems & {};

export async function configureBaseAwilixContainer(
  appConfig: AppConfig,
  rootLogger: Logger,
): Promise<AwilixContainer<AppSingletonCradle>> {
  const container = createContainer<AppSingletonCradle>();

  const { temporalClient } = await buildTemporalConnection({
    address: appConfig.temporal.address,
    namespace: appConfig.temporal.namespace,
  });

  container.register({
    config: asValue(appConfig),
    logger: asValue(rootLogger),
    fetch: asFunction(({ logger }: AppSingletonCradle) =>
      loggedFetch(logger, globalFetch),
    ),

    dbROPool: asFunction(({ config, logger }: AppSingletonCradle) => {
      return buildDbPoolFromConfig(
        "readonly",
        logger,
        config.postgres.readonly,
      );
    }).singleton(),

    dbPool: asFunction(({ config, logger }: AppSingletonCradle) => {
      return buildDbPoolFromConfig(
        "readwrite",
        logger,
        config.postgres.readwrite,
      );
    }).singleton(),

    dbRO: asFunction(({ logger, config, dbROPool }: AppSingletonCradle) => {
      return drizzle(dbROPool, {
        logger: buildDrizzleLogger(
          loggerWithLevel(logger, config.postgres.readonly.logLevel, {
            component: "drizzle-ro",
          }),
        ),
        casing: "snake_case",
      });
    }),

    db: asFunction(({ logger, config, dbPool }: AppSingletonCradle) => {
      return drizzle(dbPool, {
        logger: buildDrizzleLogger(
          loggerWithLevel(logger, config.postgres.readwrite.logLevel, {
            component: "drizzle",
          }),
        ),
        casing: "snake_case",
      });
    }),

    redis: asFunction(({ config }: AppSingletonCradle) => {
      return new Redis(config.redis.url);
    }).singleton(),

    redisSWR: asFunction(({ config, logger, redis }: AppSingletonCradle) =>
      buildRedisSWRCache(logger, config.redis.logSwrEvents, redis),
    ).singleton(),

    memorySWR: asFunction(({ config, logger }: AppSingletonCradle) =>
      buildMemorySwrCache(config.memorySwr, logger),
    ).singleton(),

    temporalClient: asValue(temporalClient),
    temporal: asFunction(
      ({ logger, temporalClient, config }: AppSingletonCradle) =>
        new TemporalClientService(
          logger,
          temporalClient,
          config.temporal.queues,
        ),
    ),
    temporalDispatch: asFunction(
      ({ temporalClient, temporal }: AppSingletonCradle) =>
        new TemporalDispatcher(temporalClient, temporal),
    ),

    vaultKeyStore: asFunction(
      ({ config }: AppSingletonCradle) => new VaultKeyStore(config.vault),
    ).singleton(),
    vault: asFunction(
      ({ vaultKeyStore }: AppSingletonCradle) =>
        new VaultService(vaultKeyStore),
    ).singleton(),

    // --- domain objects below here
    zxcvbn: asFunction(({ fetch }: AppSingletonCradle) => {
      initializeZxcvbn(fetch);
      return zxcvbn();
    }).singleton(),

    mailTransport: asFunction(({ logger, config }: AppSingletonCradle) =>
      createMailTransport(logger, config.emailDelivery),
    ).singleton(),

    _minio: asFunction(({ logger, config }: AppSingletonCradle) => {
      return buildMinioClient(logger, config.s3);
    }).singleton(),

    s3: asFunction(
      ({ logger, _minio, fetch, config }: AppSingletonCradle) =>
        new ObjectStoreService(
          logger,
          _minio,
          fetch,
          config.urls,
          config.s3.buckets,
        ),
    ),

    images: asFunction(
      ({
        logger,
        config,
        db,
        dbRO,
        temporalDispatch,
        s3,
        vault,
      }: AppSingletonCradle) =>
        new ImagesService(
          logger,
          config.urls,
          db,
          dbRO,
          temporalDispatch,
          s3,
          vault,
        ),
    ),

    llmPrompter: asFunction(
      ({ logger, config, db, vault }: AppSingletonCradle) =>
        new LlmPrompterService(logger, config.llmPrompter, db, vault),
    ),

    // domain objects below here
    tenants: asFunction(
      ({ logger, db, dbRO }: AppSingletonCradle) =>
        new TenantService(logger, db, dbRO),
    ),
    auth: asFunction(
      ({
        logger,
        db,
        fetch,
        config,
        redis,
        vault,
        users,
        authConnectors,
      }: AppSingletonCradle) =>
        new AuthService(
          logger,
          db,
          fetch,
          config.auth,
          config.urls,
          redis,
          vault,
          users,
          authConnectors,
        ),
    ),

    authConnectors: asFunction(
      ({ logger, db, dbRO, vault, fetch }: AppSingletonCradle) =>
        new AuthConnectorService(logger, db, dbRO, vault, fetch),
    ),

    users: asFunction(
      ({ logger, db, dbRO, vault }: AppSingletonCradle) =>
        new UserService(logger, db, dbRO, vault),
    ),
  });

  return container;
}
