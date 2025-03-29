import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { TenantIds } from "../../tenants/id.js";
import { UnitIds } from "../../units/id.js";

import { ReferenceDirection } from "./ask-reference.js";
import { AnswerIds, AskIds } from "./id.js";

// Base question
export const BaseQuestion = schemaType(
  "BaseQuestion",
  Type.Object({
    question_text: Type.String(),
    description: Type.Optional(Type.String()),
  }),
);
export type BaseQuestion = Static<typeof BaseQuestion>;

// Boolean question
export const BooleanQuestion = schemaType(
  "BooleanQuestion",
  Type.Intersect([
    BaseQuestion,
    Type.Object({
      type: Type.Literal("boolean"),
      true_text: Type.String(), // Text for true value
      false_text: Type.String(), // Text for false value
    }),
  ]),
);
export type BooleanQuestion = Static<typeof BooleanQuestion>;

// Gradient (scale) question
export const GradientQuestion = schemaType(
  "GradientQuestion",
  Type.Intersect([
    BaseQuestion,
    Type.Object({
      type: Type.Literal("gradient"),
      min_value: Type.Number(),
      max_value: Type.Number(),
      step: Type.Number(),
      labels: Type.Record(Type.String(), Type.String()), // Map of value -> label text
    }),
  ]),
);
export type GradientQuestion = Static<typeof GradientQuestion>;

// Multiple choice question
export const MultipleChoiceQuestion = schemaType(
  "MultipleChoiceQuestion",
  Type.Intersect([
    BaseQuestion,
    Type.Object({
      type: Type.Literal("multiple_choice"),
      options: Type.Array(
        Type.Object({
          value: Type.String(),
          text: Type.String(), // Display text for this option
        }),
      ),
      allow_multiple: Type.Optional(Type.Boolean()),
    }),
  ]),
);
export type MultipleChoiceQuestion = Static<typeof MultipleChoiceQuestion>;

// Text question
export const TextQuestion = schemaType(
  "TextQuestion",
  Type.Intersect([
    BaseQuestion,
    Type.Object({
      type: Type.Literal("text"),
      minimum_words: Type.Optional(Type.Number()),
      maximum_words: Type.Optional(Type.Number()),
      cleanup: Type.Optional(
        Type.Union([
          Type.Boolean(),
          Type.Object({
            llm_context: Type.String(),
          }),
        ]),
      ),
    }),
  ]),
);
export type TextQuestion = Static<typeof TextQuestion>;

// Union of all question types
export const Question = schemaType(
  "Question",
  Type.Union([
    BooleanQuestion,
    GradientQuestion,
    MultipleChoiceQuestion,
    TextQuestion,
  ]),
);
export type Question = Static<typeof Question>;

// The full query schema
export const AskQuery = schemaType(
  "AskQuery",
  Type.Object({
    questions: Type.Array(
      Type.Object({
        id: Type.String(), // Unique ID for this question within the ask
        question: Question,
        required: Type.Optional(Type.Boolean()),
      }),
    ),
  }),
);
export type AskQuery = Static<typeof AskQuery>;

// Visibility enum
export const AskVisibility = schemaType(
  "AskVisibility",
  Type.Union([
    Type.Literal("private"),
    Type.Literal("derive-only"),
    Type.Literal("upward"),
    Type.Literal("downward"),
    Type.Literal("public"),
  ]),
);
export type AskVisibility = Static<typeof AskVisibility>;

// Multiple answer strategy enum
export const MultipleAnswerStrategy = schemaType(
  "MultipleAnswerStrategy",
  Type.Union([Type.Literal("disallow"), Type.Literal("remember-last")]),
);
export type MultipleAnswerStrategy = Static<typeof MultipleAnswerStrategy>;

// Ask DTO
export const AskPublic = schemaType(
  "AskPublic",
  Type.Object({
    __type: Type.Literal("AskPublic"),
    askId: AskIds.TRichId,
    tenantId: TenantIds.TRichId,
    hardcodeKind: Type.Optional(Type.String()),
    sourceAgentName: Type.Optional(Type.String()),
    query: AskQuery,
    visibility: AskVisibility,
    multipleAnswerStrategy: MultipleAnswerStrategy,
    createdAt: Type.String({ format: "date-time" }),
  }),
);
export type AskPublic = Static<typeof AskPublic>;

export const CreateAskInput = schemaType(
  "CreateAskInput",
  Type.Object({
    __type: Type.Literal("CreateAskInput"),
    hardcodeKind: Type.Optional(Type.String()),
    sourceAgentName: Type.Optional(Type.String()),
    notifySourceAgent: Type.Optional(Type.Boolean()),
    query: AskQuery,
    visibility: AskVisibility,
    multipleAnswerStrategy: MultipleAnswerStrategy,

    // References - at least one subject and one object required
    references: Type.Array(
      Type.Object({
        referenceDirection: ReferenceDirection,
        // Only one of these should be provided per reference
        unitId: Type.Optional(UnitIds.TRichId),
        // initiativeId: Type.Optional(InitiativeIds.TRichId),
        // capabilityId: Type.Optional(CapabilityIds.TRichId),
        answerId: Type.Optional(AnswerIds.TRichId),
      }),
    ),
  }),
);
export type CreateAskInput = Static<typeof CreateAskInput>;

// Get Ask Input Schema
export const GetAskInput = schemaType(
  "GetAskInput",
  Type.Object({
    __type: Type.Literal("GetAskInput"),
    askId: AskIds.TRichId,
  }),
);
export type GetAskInput = Static<typeof GetAskInput>;

// List Asks Input Schema
export const ListAsksInput = schemaType(
  "ListAsksInput",
  Type.Object({
    __type: Type.Literal("ListAsksInput"),
    // Optional filters
    unitId: Type.Optional(UnitIds.TRichId),
    // initiativeId: Type.Optional(InitiativeIds.TRichId),
    // capabilityId: Type.Optional(CapabilityIds.TRichId),
    referenceDirection: Type.Optional(ReferenceDirection),
    limit: Type.Optional(Type.Number()),
    offset: Type.Optional(Type.Number()),
  }),
);
export type ListAsksInput = Static<typeof ListAsksInput>;
