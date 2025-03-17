import { activity } from "../../../../_worker/activity-helpers.js";
import { normalizeDeepgramResult } from "../backends/deepgram/normalize.js";

import { type HandleTranscriptionOutput } from "./handle-transcription.js";
import { type NormalizedTranscriptionResult } from "./schemas/index.js";

export type NormalizeTranscriptionInput = HandleTranscriptionOutput;

export const normalizeTranscriptionActivity = activity(
  "normalizeTranscription",
  {
    fn: async (
      _context,
      logger,
      _deps,
      input: NormalizeTranscriptionInput,
    ): Promise<NormalizedTranscriptionResult> => {
      logger.debug("Normalizing transcription result", {
        backend: input.backend,
      });

      // Route to the appropriate normalizer based on the backend
      switch (input.backend) {
        case "deepgram":
          return normalizeDeepgramResult(
            input.result.result,
            input.result.metadata,
          );
        default:
          // eslint-disable-next-line no-case-declarations
          const _exhaustiveCheck: never = input.backend;
          throw new Error(
            `Unsupported transcription backend: ${input.backend}`,
          );
      }
    },
  },
);
