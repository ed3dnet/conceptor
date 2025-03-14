import { Type, type Static } from "@sinclair/typebox";

import { requireStr, getStr } from "../../../_config/env-prefix.js";

// Deepgram backend configuration
export const DeepgramTranscriptionBackendConfig = Type.Object({
  kind: Type.Literal("deepgram"),
  apiKey: Type.String(),
  model: Type.String(),
});
export type DeepgramTranscriptionBackendConfig = Static<
  typeof DeepgramTranscriptionBackendConfig
>;

// The backend discriminated union
export const TranscriptionBackendConfig = Type.Union([
  DeepgramTranscriptionBackendConfig,
]);
export type TranscriptionBackendConfig = Static<
  typeof TranscriptionBackendConfig
>;

// The top-level TranscriptionConfig container
export const TranscriptionConfig = Type.Object({
  backend: TranscriptionBackendConfig,
});
export type TranscriptionConfig = Static<typeof TranscriptionConfig>;

// Env loader function
export function loadTranscriptionConfigFromEnv(): {
  transcription: TranscriptionConfig;
} {
  const kind = requireStr("TRANSCRIPTION__BACKEND__KIND");

  let backend: TranscriptionBackendConfig;

  if (kind === "deepgram") {
    backend = {
      kind: "deepgram",
      apiKey: requireStr("TRANSCRIPTION__BACKEND__DEEPGRAM__API_KEY"),
      model: getStr("TRANSCRIPTION__BACKEND__DEEPGRAM__MODEL", "nova-3"),
    };
  } else {
    throw new Error(`Unsupported transcription provider kind: ${kind}`);
  }

  return {
    transcription: {
      backend,
    },
  };
}
