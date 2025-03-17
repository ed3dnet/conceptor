import { type Static, Type } from "@sinclair/typebox";

export const OnTranscriptionCompleteEvent = Type.Object({
  kind: Type.Literal("transcriptionComplete"),
  transcriptionJobId: Type.String(),
  transcriptionText: Type.String(),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export type OnTranscriptionCompleteEvent = Static<
  typeof OnTranscriptionCompleteEvent
>;

export const OnTranscriptionFailedEvent = Type.Object({
  kind: Type.Literal("transcriptionFailed"),
  jobId: Type.String(),
  errorMessage: Type.String(),
});
export type OnTranscriptionFailedEvent = Static<
  typeof OnTranscriptionFailedEvent
>;

export const TranscriptionEvent = Type.Union([
  OnTranscriptionCompleteEvent,
  OnTranscriptionFailedEvent,
]);
export type TranscriptionEvent = Static<typeof TranscriptionEvent>;
