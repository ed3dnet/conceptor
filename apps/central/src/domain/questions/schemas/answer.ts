import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { AnswerIds, AskIds, AskResponseIds } from "./id.js";

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

export const GetAnswerInput = schemaType(
  "GetAnswerInput",
  Type.Object({
    __type: Type.Literal("GetAnswerInput"),
    answerId: AnswerIds.TRichId,
  }),
);
export type GetAnswerInput = Static<typeof GetAnswerInput>;

// List Answers Input Schema
export const ListAnswersInput = schemaType(
  "ListAnswersInput",
  Type.Object({
    __type: Type.Literal("ListAnswersInput"),
    askResponseId: Type.Optional(AskResponseIds.TRichId),
    askId: Type.Optional(AskIds.TRichId),
    limit: Type.Optional(Type.Number()),
    offset: Type.Optional(Type.Number()),
  }),
);
export type ListAnswersInput = Static<typeof ListAnswersInput>;
