import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { type TenantId, TenantIds } from "./id.js";

export const TenantPublic = schemaType(
  "TenantPublic",
  Type.Object({
    tenantId: TenantIds.TRichId,
    slug: Type.String(),
    displayName: Type.String(),
  }),
);
export type TenantPublic = Static<typeof TenantPublic>;

export const CreateTenantInput = schemaType(
  "CreateTenantInput",
  Type.Object({
    tenantId: Type.Optional(TenantIds.TRichId),
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
