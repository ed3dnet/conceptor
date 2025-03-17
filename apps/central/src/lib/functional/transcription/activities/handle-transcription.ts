import { activity } from "../../../../_worker/activity-helpers.js";
import { type S3Locator } from "../../object-store/types.js";
import {
  transcribeWithDeepgram,
  type TranscribeWithDeepgramOutput,
} from "../backends/deepgram/index.js";
import { type TranscriptionOptions } from "../schemas.js";

export interface HandleTranscriptionInput {
  transcriptionJobId: string;
  sourceFile: S3Locator;
  options: TranscriptionOptions;
}

// Define backend-specific result types
export interface DeepgramTranscriptionOutput {
  backend: "deepgram";
  result: TranscribeWithDeepgramOutput;
}

// Union type for all possible outputs
export type HandleTranscriptionOutput = DeepgramTranscriptionOutput;

export const handleTranscriptionActivity = activity("handleTranscription", {
  fn: async (
    _context,
    logger,
    deps,
    input: HandleTranscriptionInput,
  ): Promise<HandleTranscriptionOutput> => {
    const { config, s3 } = deps;

    logger.debug("Starting transcription process", {
      transcriptionJobId: input.transcriptionJobId,
      sourceFile: input.sourceFile,
    });

    // Determine which backend to use based on config
    const backendKind = config.transcription.backend.kind;

    // Route to the appropriate backend
    if (backendKind === "deepgram") {
      logger.debug("Using Deepgram transcription backend");
      const deepgramResult = await transcribeWithDeepgram(
        config.transcription,
        s3,
        input.sourceFile,
        input.options,
      );

      return {
        backend: "deepgram",
        result: deepgramResult,
      };
    } else {
      throw new Error(`Unsupported transcription backend: ${backendKind}`);
    }
  },
});
