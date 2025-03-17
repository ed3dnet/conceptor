import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { S3BucketName } from "../object-store/config.js";
import { WorkflowSignalLocator } from "../temporal-dispatcher/types.js";

// Base options that apply to all transcription providers
export const AppTranscriptionOptions = Type.Object({
  temporalSignal: Type.Optional(WorkflowSignalLocator),
});
export type AppTranscriptionOptions = Static<typeof AppTranscriptionOptions>;

export const DeepgramTranscriptionOptions = Type.Object({
  model: Type.Optional(Type.String()),
  detectLanguage: Type.Optional(Type.Boolean()),
  punctuate: Type.Optional(Type.Boolean()),
  profanityFilter: Type.Optional(Type.Boolean()),
  redact: Type.Optional(Type.Array(Type.String())),
  diarize: Type.Optional(Type.Boolean()),
  multichannel: Type.Optional(Type.Boolean()),
  alternatives: Type.Optional(Type.Number()),
  keywords: Type.Optional(Type.Array(Type.String())),
  utterances: Type.Optional(Type.Boolean()),
});
export type DeepgramTranscriptionOptions = Static<
  typeof DeepgramTranscriptionOptions
>;

export const TranscriptionOptions = Type.Object({
  app: AppTranscriptionOptions,
  deepgram: DeepgramTranscriptionOptions,
});
export type TranscriptionOptions = Static<typeof TranscriptionOptions>;

export const CreateTranscriptionJobInput = schemaType(
  "CreateTranscriptionJobInput",
  Type.Object({
    tenantId: Type.String(),
    sourceFile: Type.Object({
      bucket: S3BucketName,
      objectName: Type.String(),
    }),
    options: TranscriptionOptions,
  }),
);
export type CreateTranscriptionJobInput = Static<
  typeof CreateTranscriptionJobInput
>;

export const CreateTranscriptionJobOutput = schemaType(
  "CreateTranscriptionJobOutput",
  Type.Object({
    transcriptionJobId: Type.String(),
  }),
);
export type CreateTranscriptionJobOutput = Static<
  typeof CreateTranscriptionJobOutput
>;
