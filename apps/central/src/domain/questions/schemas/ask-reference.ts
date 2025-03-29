import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { UnitIds } from "../../units/id.js";

import { AskIds, AskReferenceIds, AnswerIds } from "./id.js";

// Reference direction enum
export const ReferenceDirection = schemaType(
  "ReferenceDirection",
  Type.Union([Type.Literal("subject"), Type.Literal("object")]),
);
export type ReferenceDirection = Static<typeof ReferenceDirection>;

// Ask Reference DTO
export const AskReferencePublic = schemaType(
  "AskReferencePublic",
  Type.Object({
    __type: Type.Literal("AskReferencePublic"),
    askReferenceId: AskReferenceIds.TRichId,
    askId: AskIds.TRichId,
    referenceDirection: ReferenceDirection,
    unitId: Type.Optional(UnitIds.TRichId),
    // initiativeId: Type.Optional(InitiativeIds.TRichId),
    // capabilityId: Type.Optional(CapabilityIds.TRichId),
    answerId: Type.Optional(AnswerIds.TRichId),
    createdAt: Type.String({ format: "date-time" }),
  }),
);
export type AskReferencePublic = Static<typeof AskReferencePublic>;
