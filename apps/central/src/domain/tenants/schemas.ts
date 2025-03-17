import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { StringUUID } from "../../lib/ext/typebox.js";

export const TenantPublic = schemaType(
  "TenantPublic",
  Type.Object({
    tenantId: StringUUID,
    slug: Type.String(),
    displayName: Type.String(),
  }),
);
export type TenantPublic = Static<typeof TenantPublic>;

export const CreateTenantInput = schemaType(
  "CreateTenantInput",
  Type.Object({
    slug: Type.String({
      minLength: 3,
      maxLength: 63,
      pattern: "^[a-z0-9-]+",
    }),
    displayName: Type.String({
      minLength: 1,
      maxLength: 255,
    }),
  }),
);
export type CreateTenantInput = Static<typeof CreateTenantInput>;
