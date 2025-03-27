import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { StringEnum, StringUUID } from "../../../lib/ext/typebox/index.js";
import { TenantIds, type TenantId } from "../../tenants/id.js";
import { type AuthConnectorId, AuthConnectorIds } from "../id.js";

import { OidcConfiguration } from "./oidc-configuration.js";

export const OIDCConnectorSettings = Type.Object({
  configurationUrl: Type.String({ format: "uri" }),
  clientId: Type.String(),
  clientSecret: Type.String(),
  scopes: Type.Array(
    StringEnum(["openid", "profile", "email", "address", "phone"]),
  ),
});
export type OIDCConnectorSettings = Static<typeof OIDCConnectorSettings>;

export const OIDCConnectorState = Type.Object({
  type: Type.Literal("openid"),
  settings: OIDCConnectorSettings,
  openidConfiguration: Type.Optional(OidcConfiguration),
});
export type OIDCConnectorState = Static<typeof OIDCConnectorState>;

export const CreateAuthConnectorInput = schemaType(
  "CreateAuthConnectorInput",
  Type.Object({
    authConnectorId: Type.Optional(AuthConnectorIds.TRichId),
    tenantId: TenantIds.TRichId,
    name: Type.String({ minLength: 1, maxLength: 255 }),
    settings: OIDCConnectorSettings,
    domains: Type.Array(Type.String({ format: "hostname" })),
  }),
);
export type CreateAuthConnectorInput = Static<typeof CreateAuthConnectorInput>;

export const UpdateAuthConnectorInput = schemaType(
  "UpdateAuthConnectorInput",
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 255 }),
    settings: OIDCConnectorSettings,
  }),
);
export type UpdateAuthConnectorInput = Static<typeof UpdateAuthConnectorInput>;

export const AuthConnectorPublic = schemaType(
  "AuthConnectorPublic",
  Type.Object({
    __type: Type.Literal("AuthConnectorPublic"),
    authConnectorId: AuthConnectorIds.TRichId,
    tenantId: TenantIds.TRichId,
    name: Type.String(),
    domains: Type.Array(Type.String()),
  }),
);
export type AuthConnectorPublic = Static<typeof AuthConnectorPublic>;
