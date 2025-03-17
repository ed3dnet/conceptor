import { Type, type Static } from "@sinclair/typebox";

// Deepgram-specific metadata based on their response structure
export const DeepgramModelInfo = Type.Object({
  name: Type.String(),
  version: Type.String(),
  arch: Type.String(),
});

export const DeepgramSummaryInfo = Type.Object({
  input_tokens: Type.Number(),
  output_tokens: Type.Number(),
  model_uuid: Type.String(),
});

export const DeepgramMetadata = Type.Object({
  transaction_key: Type.String(),
  request_id: Type.String(),
  sha256: Type.String(),
  created: Type.String(),
  duration: Type.Number(),
  channels: Type.Number(),
  models: Type.Array(Type.String()),
  model_info: Type.Record(Type.String(), DeepgramModelInfo),
  summary_info: Type.Optional(DeepgramSummaryInfo),
});
export type DeepgramMetadata = Static<typeof DeepgramMetadata>;

export const DeepgramTranscriptionMetadata = Type.Object({
  backendKind: Type.Literal("deepgram"),
  modelName: Type.String(),
  deepgramMetadata: DeepgramMetadata,
  additionalInfo: Type.Record(Type.String(), Type.Unknown()),
});
export type DeepgramTranscriptionMetadata = Static<
  typeof DeepgramTranscriptionMetadata
>;

// Deepgram response structure translated to TypeBox

export const DeepgramWord = Type.Object({
  word: Type.String(),
  start: Type.Number(),
  end: Type.Number(),
  confidence: Type.Number(),
  punctuated_word: Type.Optional(Type.String()),
  speaker: Type.Optional(Type.Number()),
});
export type DeepgramWord = Static<typeof DeepgramWord>;

export const DeepgramAlternative = Type.Object({
  transcript: Type.String(),
  confidence: Type.Number(),
  words: Type.Array(DeepgramWord),
  summaries: Type.Optional(
    Type.Array(
      Type.Object({
        summary: Type.String(),
        start_word: Type.Number(),
        end_word: Type.Number(),
      }),
    ),
  ),
});
export type DeepgramAlternative = Static<typeof DeepgramAlternative>;

export const DeepgramChannel = Type.Object({
  alternatives: Type.Array(DeepgramAlternative),
});
export type DeepgramChannel = Static<typeof DeepgramChannel>;

export const DeepgramTranscribeResults = Type.Object({
  channels: Type.Array(DeepgramChannel),
  utterances: Type.Optional(
    Type.Array(
      Type.Object({
        start: Type.Number(),
        end: Type.Number(),
        confidence: Type.Number(),
        channel: Type.Number(),
        transcript: Type.String(),
        words: Type.Array(DeepgramWord),
        speaker: Type.Optional(Type.Number()),
        id: Type.Optional(Type.String()),
      }),
    ),
  ),
});
export type DeepgramTranscribeResults = Static<
  typeof DeepgramTranscribeResults
>;
