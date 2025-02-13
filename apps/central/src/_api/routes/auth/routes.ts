import { request } from "http";

import {
  NotFoundError,
  BadRequestError,
} from "@myapp/shared-universal/errors/index.js";
import { Type } from "@sinclair/typebox";
import cryptoRandomString from "crypto-random-string";
import fp from "fastify-plugin";

import { type AppFastify } from "../../http/type-providers.js";
import { RedirectResponse } from "../schemas.js";

import { GetTenantAuthConnectorsResponse } from "./schemas.js";

async function authRoutes(fastify: AppFastify) {
  fastify.get<{
    Params: {
      tenantIdOrSlug: string;
    };
  }>("/tenant/:tenantIdOrSlug/auth/connectors", {
    schema: {
      params: Type.Object({
        tenantIdOrSlug: Type.String(),
      }),
      response: {
        200: GetTenantAuthConnectorsResponse,
      },
    },
    oas: {
      tags: ["auth"],
      description: "Get the auth connectors for a tenant",
      security: [],
    },
    handler: async (request, reply) => {
      const connectors = await request.deps.authConnectors.getByTenantId(
        request.params.tenantIdOrSlug,
      );

      const publicConnectors = await Promise.all(
        connectors.map((c) => request.deps.authConnectors.toPublic(c)),
      );

      return { authConnectors: publicConnectors };
    },
  });

  fastify.get<{
    Params: {
      tenantIdOrSlug: string;
      authConnectorId: string;
    };
    Querystring: {
      redirectUri: string;
    };
  }>("/tenant/:tenantIdOrSlug/auth/:authConnectorId/login", {
    schema: {
      params: Type.Object({
        tenantIdOrSlug: Type.String(),
        authConnectorId: Type.String({ format: "uuid" }),
      }),
      querystring: Type.Object({
        redirectUri: Type.String({ format: "uri" }),
      }),
      response: {
        302: RedirectResponse,
      },
    },
    oas: {
      tags: ["auth"],
      description: "Initiate OAuth flow for a tenant's employee",
      security: [],
      responses: {
        302: {
          description: "Redirect to the OAuth provider",
        },
      },
    },
    handler: async (request, reply) =>
      request.deps.tenants.withTenantByIdOrSlug(
        request.params.tenantIdOrSlug,
        async (tenant) => {
          const { auth } = request.deps;
          const url = await auth.initiateOAuthFlow(
            tenant.tenantId,
            request.params.authConnectorId,
            request.query.redirectUri,
          );
          const urlString = url.toString();

          reply.code(302);
          reply.header("Location", urlString);

          return { redirectTo: urlString };
        },
      ),
  });

  fastify.get<{
    Params: {
      tenantIdOrSlug: string;
      authConnectorId: string;
    };
    Querystring: {
      code: string;
      state: string;
    };
  }>("/auth/callback", {
    schema: {
      params: Type.Object({
        tenantIdOrSlug: Type.String(),
        authConnectorId: Type.String({ format: "uuid" }),
      }),
      querystring: Type.Object({
        code: Type.String(),
        state: Type.String(),
      }),
    },
    oas: {
      omit: true,
      security: [],
    },
    handler: async (request, reply) => {
      const { auth } = request.deps;

      await auth.handleOAuthCallback(
        request.params.tenantIdOrSlug,
        request.params.authConnectorId,
        request.query.code,
        request.query.state,
      );
    },
  });
}

export const AUTH_ROUTES = fp(authRoutes, {
  name: "AUTH_ROUTES",
  fastify: ">= 4",
});
