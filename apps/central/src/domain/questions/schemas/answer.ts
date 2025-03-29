import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { AnswerIds, AskResponseIds } from "./id.js";

// Answer DTO
export const AnswerPublic = schemaType(
  "AnswerPublic",
  Type.Object({
    __type: Type.Literal("AnswerPublic"),
    answerId: AnswerIds.TRichId,
    askResponseId: AskResponseIds.TRichId,
    text: Type.String(),
    createdAt: Type.String({ format: "date-time" }),
  }),
);
export type AnswerPublic = Static<typeof AnswerPublic>;
