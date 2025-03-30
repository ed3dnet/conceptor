import "@eropple/fastify-openapi3";
import "@fastify/cookie";

import { type AwilixContainer } from "awilix";
import { type FastifyRequest } from "fastify";

import {
  type AppRequestCradle,
  type AppSingletonCradle,
} from "../../_deps/index.js";
import { type AppTenantSingletonScopeItems } from "../../_deps/tenant-scope.js";
import { type TenantPublic } from "../../domain/tenants/schemas.js";
import { type UserPrivate } from "../../domain/users/schemas.js";

export type RootContainer = AwilixContainer<AppSingletonCradle>;
export type RequestContainer = AwilixContainer<AppRequestCradle>;

declare module "fastify" {
  interface FastifyRequest {
    readonly traceId: string;
    readonly diScope: RequestContainer;
    readonly requestDeps: AppRequestCradle;

    readonly user: UserPrivate | undefined;
    readonly tenancy:
      | {
          tenant: TenantPublic;
          container: AwilixContainer<AppTenantSingletonScopeItems>;
          deps: AppTenantSingletonScopeItems;
        }
      | undefined;
  }

  interface FastifyInstance {
    readonly diContainer: RootContainer;
    deps(): AppSingletonCradle;
  }
}
