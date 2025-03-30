import { type ApiKeySecurityScheme } from "@eropple/fastify-openapi3";
import {
  NotFoundError,
  UnauthorizedError,
} from "@myapp/shared-universal/errors/index.js";
import { type AwilixContainer } from "awilix";
import {
  type FastifyRequest,
  type FastifyReply,
  type RouteGenericInterface,
  RouteShorthandOptions,
} from "fastify";

import { type DBTenant, type DBUser } from "../../_db/models.js";
import {
  type AppTenantSingletonScopeItems,
  configureTenantDomainContainer,
  type AppTenantRequestScopeItems,
} from "../../_deps/tenant-scope.js";
import { type AuthConfig } from "../../domain/auth/config.js";
import { type TenantPublic } from "../../domain/tenants/schemas.js";
import { type UserPrivate } from "../../domain/users/schemas.js";

export const TENANT_USER_AUTH_SCHEME = "TenantUserCookie";
export const TENANT_USER_AUTH = { [TENANT_USER_AUTH_SCHEME]: [] };
export function buildTenantUserCookieHandler(
  authConfig: AuthConfig,
): ApiKeySecurityScheme {
  return {
    type: "apiKey",
    in: "cookie",
    name: authConfig.sessionCookie.name,
    fn: async (value, request) => {
      const { tenants, tenantDomainBuilder } = request.requestDeps;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { tenantIdOrSlug } = request.params as any;

      if (!tenantIdOrSlug) {
        request.log.error(
          `${TENANT_USER_AUTH_SCHEME} executed but no tenant found (missing URL params!)`,
        );
        return { ok: false, code: 401 };
      }

      const tenant = await tenants.getByIdOrSlug(tenantIdOrSlug);

      if (!tenant) {
        request.log.warn(
          `${TENANT_USER_AUTH_SCHEME} executed but tenant ${tenantIdOrSlug} not found`,
        );
        return { ok: false, code: 401 };
      }

      if (!tenant) {
        request.log.warn(
          `${TENANT_USER_AUTH_SCHEME} executed but tenant ${tenantIdOrSlug} not found`,
        );
        return { ok: false, code: 401 };
      }

      const tenantContainer = await tenantDomainBuilder(tenant.tenantId);
      // @ts-expect-error this is where we set a readonly value
      request.tenancy = {
        tenant,
        container: tenantContainer,
        deps: tenantContainer.cradle,
      };

      const user =
        await request.tenancy.deps.auth.resolveSessionTokenToUser(value);

      if (!user) {
        return { ok: false, code: 401 };
      }

      if (user.tenantId !== tenant.tenantId) {
        request.log.error(
          {
            userId: user.userId,
            userTenantId: user.tenantId,
            expectedTenantId: tenant.tenantId,
          },
          `${TENANT_USER_AUTH_SCHEME} executed but user ${user.userId} is not in tenant ${tenant.tenantId}`,
        );
        return { ok: false, code: 401 };
      }

      // @ts-expect-error this is where we set a readonly value
      request.user = user;

      return { ok: true };
    },
  };
}

/**
 * This function ensures that the user has a resolved tenant.
 */
export function tH<
  TRet,
  TRequest extends FastifyRequest,
  TReply extends FastifyReply,
>(
  request: TRequest,
  reply: TReply,
  fn: (
    tenant: TenantPublic,
    tenantDeps: AppTenantSingletonScopeItems,
  ) => TRet | Promise<TRet>,
) {
  if (request.tenancy) {
    return fn(request.tenancy.tenant, request.tenancy.deps);
  }

  throw new UnauthorizedError("Not authenticated");
}
/**
 * This function ensures that the user is both logged in and has a resolved tenant.
 * @param fn
 * @returns
 */
export function uH<
  TRet,
  TRequest extends FastifyRequest,
  TReply extends FastifyReply,
>(
  request: TRequest,
  reply: TReply,
  fn: (
    user: UserPrivate,
    tenant: TenantPublic,
    tenantDeps: AppTenantSingletonScopeItems,
  ) => TRet | Promise<TRet>,
) {
  if (request.tenancy && request.user) {
    return fn(request.user, request.tenancy.tenant, request.tenancy.deps);
  }

  throw new UnauthorizedError("Not authenticated");
}
