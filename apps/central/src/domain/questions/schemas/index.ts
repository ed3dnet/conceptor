import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import {
  ListInputBase,
  buildListCursorSchema,
  buildListResponseSchema,
} from "../../shared/schemas/lists.js";
import { TenantIds } from "../../tenants/id.js";
import { UnitIds } from "../../units/id.js";
import { UserIds } from "../../users/id.js";

import { AnswerIds, AskIds, AskReferenceIds, AskResponseIds } from "./id.js";

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
    references: Type.Array(AskReferencePublic, {
      minItems: 2,
    }),
  }),
);
export type AskPublic = Static<typeof AskPublic>;

export const CreateAskInput = schemaType(
  "CreateAskInput",
  Type.Object({
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
    askId: AskIds.TRichId,
  }),
);
export type GetAskInput = Static<typeof GetAskInput>;

// List Asks Input Schema
export const ListAsksInput = schemaType(
  "ListAsksInput",
  Type.Object({
    ...ListInputBase.properties,
    // Optional filters
    unitId: Type.Optional(UnitIds.TRichId),
    // initiativeId: Type.Optional(InitiativeIds.TRichId),
    // capabilityId: Type.Optional(CapabilityIds.TRichId),
    referenceDirection: Type.Optional(ReferenceDirection),
  }),
);
export type ListAsksInput = Static<typeof ListAsksInput>;

// List Asks Cursor Schema
export const ListAsksCursor = buildListCursorSchema(ListAsksInput);
export type ListAsksCursor = Static<typeof ListAsksCursor>;

// List Asks Input or Cursor Schema
export const ListAsksInputOrCursor = schemaType(
  "ListAsksInputOrCursor",
  Type.Union([
    ListAsksInput,
    Type.Object({
      cursor: Type.String(),
    }),
  ]),
);
export type ListAsksInputOrCursor = Static<typeof ListAsksInputOrCursor>;

// List Asks Response Schema
export const AskListItem = schemaType(
  "AskListItem",
  Type.Object({
    __type: Type.Literal("AskListItem"),
    askId: AskIds.TRichId,
    tenantId: TenantIds.TRichId,
    hardcodeKind: Type.Optional(Type.String()),
    sourceAgentName: Type.Optional(Type.String()),
    visibility: AskVisibility,
    multipleAnswerStrategy: MultipleAnswerStrategy,
    createdAt: Type.String({ format: "date-time" }),
  }),
);
export type AskListItem = Static<typeof AskListItem>;

export const ListAsksResponse = buildListResponseSchema(AskListItem);
export type ListAsksResponse = Static<typeof ListAsksResponse>;

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

export const CreateAskResponseInput = schemaType(
  "CreateAskResponseInput",
  Type.Object({
    askId: AskIds.TRichId,
    response: AskResponseData,
  }),
);
export type CreateAskResponseInput = Static<typeof CreateAskResponseInput>;

// Get Ask Response Input Schema
export const GetAskResponseInput = schemaType(
  "GetAskResponseInput",
  Type.Object({
    askResponseId: AskResponseIds.TRichId,
  }),
);
export type GetAskResponseInput = Static<typeof GetAskResponseInput>;

// List Ask Responses Input Schema
export const ListAskResponsesInput = schemaType(
  "ListAskResponsesInput",
  Type.Object({
    ...ListInputBase.properties,
    askId: AskIds.TRichId,
  }),
);
export type ListAskResponsesInput = Static<typeof ListAskResponsesInput>;

// List Ask Responses Cursor Schema
export const ListAskResponsesCursor = buildListCursorSchema(
  ListAskResponsesInput,
);
export type ListAskResponsesCursor = Static<typeof ListAskResponsesCursor>;

// List Ask Responses Input or Cursor Schema
export const ListAskResponsesInputOrCursor = schemaType(
  "ListAskResponsesInputOrCursor",
  Type.Union([
    ListAskResponsesInput,
    Type.Object({
      cursor: Type.String(),
    }),
  ]),
);
export type ListAskResponsesInputOrCursor = Static<
  typeof ListAskResponsesInputOrCursor
>;

// List Ask Responses Response Schema
export const AskResponseListItem = schemaType(
  "AskResponseListItem",
  Type.Object({
    __type: Type.Literal("AskResponseListItem"),
    askResponseId: AskResponseIds.TRichId,
    askId: AskIds.TRichId,
    userId: UserIds.TRichId,
    createdAt: Type.String({ format: "date-time" }),
  }),
);
export type AskResponseListItem = Static<typeof AskResponseListItem>;

export const ListAskResponsesResponse =
  buildListResponseSchema(AskResponseListItem);
export type ListAskResponsesResponse = Static<typeof ListAskResponsesResponse>;

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
