import type { IncomingMessage, Server, ServerResponse } from "node:http";

import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";

import "./type-extensions.js";

export type AppFastify = FastifyInstance<
  Server<typeof IncomingMessage, typeof ServerResponse>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export {};
