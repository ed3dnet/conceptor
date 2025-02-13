import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { AuthConnectorPublic } from "../../../domain/auth-connectors/schemas/index.js";

export const GetTenantAuthConnectorsResponse = schemaType(
  "GetTenantAuthConnectorsResponse",
  Type.Object({
    authConnectors: Type.Array(AuthConnectorPublic),
  }),
);
export type GetTenantAuthConnectorsResponse = Static<
  typeof GetTenantAuthConnectorsResponse
>;
