import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

export const RedirectResponse = schemaType(
  "RedirectResponse",
  Type.Object({
    redirectTo: Type.String(),
  }),
);
export type RedirectResponse = Static<typeof RedirectResponse>;
