import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { UserIds } from "../../users/id.js";

import { AskIds, AskResponseIds } from "./id.js";

// Boolean answer
export const BooleanAnswer = schemaType(
  "BooleanAnswer",
  Type.Object({
    type: Type.Literal("boolean"),
    value: Type.Boolean(),
  }),
);
export type BooleanAnswer = Static<typeof BooleanAnswer>;

// Gradient answer
export const GradientAnswer = schemaType(
  "GradientAnswer",
  Type.Object({
    type: Type.Literal("gradient"),
    value: Type.Number(),
  }),
);
export type GradientAnswer = Static<typeof GradientAnswer>;

// Multiple choice answer
export const MultipleChoiceAnswer = schemaType(
  "MultipleChoiceAnswer",
  Type.Object({
    type: Type.Literal("multiple_choice"),
    value: Type.Union([
      Type.String(),
      Type.Array(Type.String()), // For multiple selections
    ]),
  }),
);
export type MultipleChoiceAnswer = Static<typeof MultipleChoiceAnswer>;

// Text answer
export const TextAnswer = schemaType(
  "TextAnswer",
  Type.Object({
    type: Type.Literal("text"),
    value: Type.String(),
  }),
);
export type TextAnswer = Static<typeof TextAnswer>;

// Union of all answer types
export const Answer = schemaType(
  "Answer",
  Type.Union([BooleanAnswer, GradientAnswer, MultipleChoiceAnswer, TextAnswer]),
);
export type Answer = Static<typeof Answer>;

// The full response schema
export const AskResponseData = schemaType(
  "AskResponseData",
  Type.Object({
    answers: Type.Record(
      Type.String(), // Question ID
      Answer,
    ),
  }),
);
export type AskResponseData = Static<typeof AskResponseData>;

// Ask Response DTO
export const AskResponsePublic = schemaType(
  "AskResponsePublic",
  Type.Object({
    __type: Type.Literal("AskResponsePublic"),
    askResponseId: AskResponseIds.TRichId,
    askId: AskIds.TRichId,
    userId: UserIds.TRichId,
    response: AskResponseData,
    createdAt: Type.String({ format: "date-time" }),
  }),
);
export type AskResponsePublic = Static<typeof AskResponsePublic>;
