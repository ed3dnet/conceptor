import { asFunction, asValue, type AwilixContainer } from "awilix";
import { type FastifyRequest } from "fastify";
import type { Logger } from "pino";

import { type AppConfig } from "../_config/types.js";
import { type TenantId } from "../domain/tenants/id.js";

import { type AppSingletonCradle } from "./singleton.js";
import {
  type AppTenantRequestScopeItems,
  configureTenantDomainContainer,
} from "./tenant-scope.js";

export type AppRequestCradle = AppSingletonCradle & {
  request: FastifyRequest;

  tenantDomainBuilder: (
    tenantId: TenantId,
  ) => Promise<AwilixContainer<AppTenantRequestScopeItems>>;
};

export async function configureRequestAwilixContainer(
  appConfig: AppConfig,
  request: FastifyRequest,
  baseContainer: AwilixContainer<AppSingletonCradle>,
): Promise<AwilixContainer<AppRequestCradle>> {
  const requestContainer = baseContainer.createScope<AppRequestCradle>();

  requestContainer.register({
    config: asValue(appConfig),
    request: asValue(request),
    logger: asValue(request.log as Logger), // Fastify uses Pino internally so it's cool

    tenantDomainBuilder: asValue(async (tenantId: TenantId) =>
      configureTenantDomainContainer(tenantId, requestContainer),
    ),
  });

  return requestContainer;
}
