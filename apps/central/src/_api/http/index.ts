import OAS3Plugin, { type OAS31 } from "@eropple/fastify-openapi3";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  ApplicationError,
  ForbiddenError,
  InternalServerError,
  UnauthorizedError,
} from "@myapp/shared-universal/errors/index.js";
import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { buildRequestIdGenerator } from "@myapp/shared-universal/utils/request-id-builder.js";
import Fastify, { type FastifyBaseLogger, type FastifyError } from "fastify";
import type * as pino from "pino";

import { type ApiAppConfig } from "../config/types.js";
import { API_ROUTES } from "../routes/index.js";

import { registerDependencyInjection } from "./deps.js";
import { requestIdPlugin } from "./request-id-plugin.js";
import { ErrorResponse, ValidationErrorResponse } from "./schemas.js";
import {
  buildTenantUserCookieHandler,
  TENANT_USER_AUTH_SCHEME,
} from "./security.js";
import { type RootContainer } from "./type-extensions.js";
import type { AppFastify } from "./type-providers.js";

function registerErrorHandler(config: ApiAppConfig, fastify: AppFastify) {
  fastify.setErrorHandler((err, request, reply) => {
    const stack = config.http.emitStackOnErrors ? err.stack : undefined;

    let resp: ErrorResponse | ValidationErrorResponse;
    if (err instanceof ApplicationError) {
      if (err.httpStatusCode > 499) {
        request.log.error({ err }, "Server error.");
      } else {
        request.log.debug({ err }, "Client error.");
      }

      reply.code(err.httpStatusCode);
      resp = {
        error: true,
        code: err.httpStatusCode,
        name: err.friendlyName,
        message: err.message,
        reqId: request.id,
        traceId: request.traceId,
        stack,
      };
    } else if ((err as FastifyError).validation) {
      const validation = (err as FastifyError).validation;
      request.log.debug({ err }, "Validation error.");
      reply.code(400);
      resp = {
        error: true,
        code: 400,
        name: "ValidationError",
        message: "Invalid request: " + err.message,
        reqId: request.id,
        traceId: request.traceId,
        stack,
        details: validation!,
      } satisfies ValidationErrorResponse;
    } else if (
      err instanceof TypeError &&
      err.message.includes("does not match schema definition")
    ) {
      request.log.debug(
        { err },
        "Validation error, but probably on response; hiding as 500. THIS IS A BUG.",
      );
      reply.code(500);
      resp = {
        error: true,
        code: 500,
        name: "InternalServerError",
        message: "An internal server error occurred.",
        reqId: request.id,
        traceId: request.traceId,
        stack,
      };
    } else {
      request.log.error(
        { err },
        "Error is not an ApplicationError or Fastify validation; this is a bug.",
      );
      reply.code(500);

      resp = {
        error: true,
        code: 500,
        name: "InternalServerError",
        message: "An internal server error occurred.",
        reqId: request.id,
        traceId: request.traceId,
        stack,
      };
    }

    request.log.debug({ resp }, "Sending error response.");
    reply.send(resp);
  });
}

export async function buildServer(
  config: ApiAppConfig,
  rootLogger: pino.Logger,
  rootContainer: RootContainer,
) {
  const idGenerator = buildRequestIdGenerator("API");
  const fastify: AppFastify = Fastify({
    exposeHeadRoutes: false,
    loggerInstance: rootLogger.child({
      context: "fastify",
    }) as FastifyBaseLogger,
    ajv: {},
    genReqId: (req) => idGenerator([req.headers["x-request-id"]].flat()[0]),
  }).withTypeProvider<TypeBoxTypeProvider>();
  await registerDependencyInjection(config, fastify, rootContainer);

  fastify.register(fastifyHelmet, {
    global: true,
    hidePoweredBy: true,
    hsts: false,

    contentSecurityPolicy: false,
  });

  fastify.register(fastifyCors, {
    origin: [config.urls.frontendBaseUrl, config.urls.apiBaseUrl],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    credentials: true,
  });

  // this is necessary because typebox adds some custom keywords to the schema
  fastify.setValidatorCompiler(({ schema }) => AJV.compile(schema));

  await fastify.register(requestIdPlugin);

  await fastify.register(fastifyCookie);
  await fastify.register(OAS3Plugin, {
    openapiInfo: {
      title: "Central API",
      version: "0.0.1",
    },
    exitOnInvalidDocument: true,
    includeUnconfiguredOperations: false,
    publish: {
      json: config.env !== "production",
      yaml: config.env !== "production",
      ui: config.env !== "production" ? "scalar" : null,
    },
    autowiredSecurity: {
      allowEmptySecurityWithNoRoot: false,
      securitySchemes: {
        [TENANT_USER_AUTH_SCHEME]: buildTenantUserCookieHandler(config.auth),
      },
      onRequestFailed: (result) => {
        if (result.code === 401) {
          throw new UnauthorizedError(
            "You are not identified. Please use an API key or OAuth2 token.",
          );
        }

        if (result.code === 403) {
          throw new ForbiddenError(
            "You do not have permission to perform this action.",
          );
        }

        throw new InternalServerError("An internal server error occurred.");
      },
    },
    preParse: (oas) => {
      oas.rootDoc.servers = [{ url: config.urls.apiBaseUrl }];

      return oas;
    },

    postOperationBuild: (route, operation) => {
      const standardErrorCodes = [400, 401, 403, 404, 429, 500];

      for (const code of standardErrorCodes) {
        if (operation.responses[code]) {
          continue;
        }

        const t = operation.responses.default;

        operation.responses[code] = {
          description: `Error with code ${code}.`,
          content: {
            "application/json": {
              schema: (code === 400
                ? ValidationErrorResponse
                : ErrorResponse) as OAS31.SchemaObject,
            },
          },
        } satisfies OAS31.ResponseObject;
      }
    },

    postParse: (oas) => {
      const logger = fastify.log.child({
        plugin: "OAS3Plugin",
        phase: "postParse",
      });
      const schemas = oas.rootDoc.components?.schemas ?? {};

      oas.rootDoc.components = oas.rootDoc.components ?? {};
      oas.rootDoc.components.schemas = schemas;

      fastify.decorate("openapiDocument", oas.rootDoc);
    },
  });

  registerErrorHandler(config, fastify);

  fastify.addHook("onRoute", (route) => {
    fastify.log.debug(
      { method: route.method, path: route.path },
      "Route registered.",
    );
  });

  await fastify.register(API_ROUTES, { prefix: "/api" });

  return fastify;
}
