import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { AskResponseIds, AskIds } from "../../questions/schemas/id.js";
import {
  ListInputBase,
  buildListCursorSchema,
  buildListResponseSchema,
} from "../../shared/schemas/lists.js";

import { AnswerIds } from "./id.js";

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
    answerId: AnswerIds.TRichId,
  }),
);
export type GetAnswerInput = Static<typeof GetAnswerInput>;

// List Answers Input Schema
export const ListAnswersInput = schemaType(
  "ListAnswersInput",
  Type.Object({
    ...ListInputBase.properties,
    askResponseId: Type.Optional(AskResponseIds.TRichId),
    askId: Type.Optional(AskIds.TRichId),
  }),
);
export type ListAnswersInput = Static<typeof ListAnswersInput>;

// List Answers Cursor Schema
export const ListAnswersCursor = buildListCursorSchema(ListAnswersInput);
export type ListAnswersCursor = Static<typeof ListAnswersCursor>;

// List Answers Input or Cursor Schema
export const ListAnswersInputOrCursor = schemaType(
  "ListAnswersInputOrCursor",
  Type.Union([
    ListAnswersInput,
    Type.Object({
      cursor: Type.String(),
    }),
  ]),
);
export type ListAnswersInputOrCursor = Static<typeof ListAnswersInputOrCursor>;

// List Answers Response Schema
export const AnswerListItem = schemaType(
  "AnswerListItem",
  Type.Object({
    __type: Type.Literal("AnswerListItem"),
    answerId: AnswerIds.TRichId,
    askResponseId: AskResponseIds.TRichId,
    text: Type.String(),
    createdAt: Type.String({ format: "date-time" }),
  }),
);
export type AnswerListItem = Static<typeof AnswerListItem>;

export const ListAnswersResponse = buildListResponseSchema(AnswerListItem);
export type ListAnswersResponse = Static<typeof ListAnswersResponse>;
