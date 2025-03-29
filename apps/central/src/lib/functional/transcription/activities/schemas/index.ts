import { Type, type Static } from "@sinclair/typebox";

import { TenantIds } from "../../../../../domain/tenants/id.js";
import { UnionOneOf } from "../../../../ext/typebox/index.js";
import { TranscriptionJobIds } from "../../id.js";

import {
  DeepgramTranscribeResults,
  DeepgramTranscriptionMetadata,
} from "./deepgram.js";

// The union of all backend-specific metadata types
export const TranscriptionMetadata = UnionOneOf([
  DeepgramTranscriptionMetadata,
]);
export type TranscriptionMetadata = Static<typeof TranscriptionMetadata>;

// Status-specific input types with required fields for each status
export const PendingStatusInput = Type.Object({
  tenantId: TenantIds.TRichId,
  transcriptionJobId: TranscriptionJobIds.TRichId,
  status: Type.Literal("pending"),
});

export const ProcessingStatusInput = Type.Object({
  tenantId: TenantIds.TRichId,
  transcriptionJobId: TranscriptionJobIds.TRichId,
  status: Type.Literal("processing"),
});

export const CompletedStatusInput = Type.Object({
  tenantId: TenantIds.TRichId,
  transcriptionJobId: TranscriptionJobIds.TRichId,
  status: Type.Literal("completed"),
  transcriptionText: Type.String(),
  transcriptionMetadata: TranscriptionMetadata,
});

export const FailedStatusInput = Type.Object({
  tenantId: TenantIds.TRichId,
  transcriptionJobId: TranscriptionJobIds.TRichId,
  status: Type.Literal("failed"),
  errorMessage: Type.String(),
});

// Union of all status-specific input types
export const UpdateTranscriptionJobStatusInput = UnionOneOf([
  PendingStatusInput,
  ProcessingStatusInput,
  CompletedStatusInput,
  FailedStatusInput,
]);
export type UpdateTranscriptionJobStatusInput = Static<
  typeof UpdateTranscriptionJobStatusInput
>;

export const TranscriptionWord = Type.Object({
  text: Type.String(),
  startTime: Type.Number(),
  endTime: Type.Number(),
  confidence: Type.Number(),
  speaker: Type.Optional(Type.Number()),
  channel: Type.Optional(Type.Number()),
});
export type TranscriptionWord = Static<typeof TranscriptionWord>;

export const DeepgramOriginalResult = Type.Object({
  kind: Type.Literal("deepgram"),
  results: DeepgramTranscribeResults,
});
export type DeepgramOriginalResult = Static<typeof DeepgramOriginalResult>;

export const OriginalResult = Type.Union([DeepgramOriginalResult]);
export type OriginalResult = Static<typeof OriginalResult>;

export const NormalizedTranscriptionResult = Type.Object({
  transcriptionText: Type.String(),
  words: Type.Array(TranscriptionWord),
  metadata: TranscriptionMetadata,
  originalResult: OriginalResult,
});
export type NormalizedTranscriptionResult = Static<
  typeof NormalizedTranscriptionResult
>;
