import {
  asFunction,
  asValue,
  type AwilixContainer,
  createContainer,
  type NameAndRegistrationPair,
} from "awilix";

import { type DBTenant } from "../_db/models.js";
import { AuthService } from "../domain/auth/service.js";
import { AuthConnectorService } from "../domain/auth-connectors/service.js";
import { QuestionsService } from "../domain/questions/service.js";
import { type TenantId } from "../domain/tenants/id.js";
import { UnitService } from "../domain/units/service.js";
import { UserService } from "../domain/users/service.js";
import { ImagesService } from "../lib/functional/images/service.js";
import { LlmPrompterService } from "../lib/functional/llm-prompter/service.js";
import { TranscriptionService } from "../lib/functional/transcription/service.js";

import { type AppRequestCradle } from "./request.js";
import {
  type AppSingletonCradle,
  type AppBaseCradleItems,
} from "./singleton.js";

/**
 * Any service that relies on a tenant ID, except the tenant service itself,
 * should be placed in this scope. The request scope will implicitly be downstream
 * of this scope any time that a tenant ID is both available and resolved, and Awilix
 * will pass `tenantId` to all services in this scope. Those services should add
 * `tenantId` as a condition for database parameters, a prefix for scoping into
 * KV datastores, etc. to protect from incidental cross-tenancy accesses.
 *
 * Access control for these things will happen at the route level, so these services
 * don't need to worry so much about that.
 *
 * ALSO, because of how Awilix works, nothing async can happen here. Typically those
 * would be asynchronous connections to databases or other services. Those should happen
 * at the singleton level and be passed down to domain-level code.
 */

export type AppTenantScopeItems = {
  tenantId: TenantId;

  // lib and framework objects
  images: ImagesService;
  llmPrompter: LlmPrompterService;
  transcription: TranscriptionService;

  // domain objects below here
  auth: AuthService;
  authConnectors: AuthConnectorService;
  users: UserService;
  units: UnitService;
  questions: QuestionsService;
};

export type AppTenantRequestScopeItems = AppRequestCradle & AppTenantScopeItems;
export type AppTenantSingletonScopeItems = AppSingletonCradle &
  AppTenantScopeItems;

export function configureTenantDomainContainer<
  T extends AppSingletonCradle | AppRequestCradle,
>(
  tenantId: TenantId,
  containerToWrap: AwilixContainer<T>,
): AwilixContainer<AppTenantScopeItems & T> {
  type TenantDomainItems = AppTenantScopeItems & T;
  const tenantDomain = containerToWrap.createScope<AppTenantScopeItems>();

  const registrations: NameAndRegistrationPair<AppTenantScopeItems> = {
    tenantId: asValue(tenantId),

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
          tenantId,
        ),
    ),

    llmPrompter: asFunction(
      ({ logger, config, db, vault }: TenantDomainItems) =>
        new LlmPrompterService(logger, config.llmPrompter, db, vault, tenantId),
    ),

    transcription: asFunction(
      ({ logger, config, db, dbRO, temporalDispatch, s3 }: TenantDomainItems) =>
        new TranscriptionService(
          logger,
          config.transcription,
          db,
          dbRO,
          temporalDispatch,
          s3,
          tenantId,
        ),
    ),

    // -------- domain objects down here
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
      }: TenantDomainItems) =>
        new AuthService(
          logger,
          db,
          fetch,
          config.auth,
          config.urls,
          config.insecureOptions,
          redis,
          vault,
          users,
          authConnectors,
          tenantId,
        ),
    ),
    authConnectors: asFunction(
      ({ logger, db, dbRO, vault, fetch }: TenantDomainItems) =>
        new AuthConnectorService(logger, db, dbRO, vault, fetch, tenantId),
    ),

    users: asFunction(
      ({ logger, db, dbRO, vault, events }: TenantDomainItems) =>
        new UserService(logger, db, dbRO, vault, events, tenantId),
    ),
    units: asFunction(
      ({ logger, db, dbRO, events, users }: TenantDomainItems) =>
        new UnitService(logger, db, dbRO, events, users, tenantId),
    ),
    questions: asFunction(
      ({ logger, db, dbRO, events }: TenantDomainItems) =>
        new QuestionsService(logger, db, dbRO, events, tenantId),
    ),
  };

  // all other registrations are coming from the parent scope, so this
  // is safe (if ugly).
  tenantDomain.register(
    registrations as NameAndRegistrationPair<T & AppTenantScopeItems>,
  );

  return tenantDomain;
}
