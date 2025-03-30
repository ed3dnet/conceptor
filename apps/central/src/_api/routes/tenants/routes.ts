import { NotFoundError } from "@myapp/shared-universal/errors/index.js";
import { Type } from "@sinclair/typebox";
import fp from "fastify-plugin";

import { TenantPublic } from "../../../domain/tenants/schemas.js";
import { type AppFastify } from "../../http/type-providers.js";

async function authRoutes(fastify: AppFastify) {
  fastify.get<{
    Params: {
      tenantIdOrSlug: string;
    };
  }>("/:tenantIdOrSlug", {
    schema: {
      params: Type.Object({
        tenantIdOrSlug: Type.String(),
      }),
      response: {
        200: TenantPublic,
      },
    },
    oas: {
      tags: ["tenants"],
      description: "Get the public information for a tenant.",
      security: [], // intentionally not secured
    },
    handler: async (request, reply) => {
      const { tenants } = request.requestDeps;

      const tenant = await tenants.getByIdOrSlug(request.params.tenantIdOrSlug);

      if (!tenant) {
        throw new NotFoundError(
          `Tenant not found with id or slug ${request.params.tenantIdOrSlug}`,
        );
      }

      return tenant;
    },
  });
}

export const TENANT_ROUTES = fp(authRoutes, {
  name: "TENANT_ROUTES",
  fastify: ">= 4",
});
