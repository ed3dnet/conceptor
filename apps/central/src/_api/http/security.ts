import { type ApiKeySecurityScheme } from "@eropple/fastify-openapi3";

import { type AuthConfig } from "../../domain/auth/config.js";

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
      const { auth, memorySWR } = request.deps;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { tenantIdOrSlug } = request.params as any;

      if (!tenantIdOrSlug) {
        request.log.error(
          `${TENANT_USER_AUTH_SCHEME} executed but no tenant found (missing URL params!)`,
        );
        return { ok: false, code: 401 };
      }

      const tenant = (
        await memorySWR(`tenants:${tenantIdOrSlug}`, async () => {
          return request.deps.tenants.getByIdOrSlug(tenantIdOrSlug);
        })
      ).value;

      if (!tenant) {
        request.log.warn(
          `${TENANT_USER_AUTH_SCHEME} executed but tenant ${tenantIdOrSlug} not found`,
        );
        return { ok: false, code: 401 };
      }

      // @ts-expect-error this is where we set a readonly value
      request.tenant = tenant;

      const user = await auth.resolveSessionTokenToEmployee(value);

      if (!user) {
        return { ok: false, code: 401 };
      }

      if (user.tenantId !== tenant.tenantId) {
        request.log.error(
          {
            userId: user.employeeId,
            userTenantId: user.tenantId,
            expectedTenantId: tenant.tenantId,
          },
          `${TENANT_USER_AUTH_SCHEME} executed but user ${user.employeeId} is not in tenant ${tenant.tenantId}`,
        );
        return { ok: false, code: 401 };
      }

      return { ok: true };
    },
  };
}
