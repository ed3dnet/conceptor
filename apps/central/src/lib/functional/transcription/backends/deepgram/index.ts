import { createClient, type PrerecordedSchema } from "@deepgram/sdk";

import { type ObjectStoreService } from "../../../object-store/service.js";
import { type S3Locator } from "../../../object-store/types.js";
import {
  type DeepgramTranscribeResults,
  type DeepgramTranscriptionMetadata,
} from "../../activities/schemas/deepgram.js";
import { type TranscriptionConfig } from "../../config.js";
import { type TranscriptionOptions } from "../../schemas.js";

export type TranscribeWithDeepgramOutput = {
  result: DeepgramTranscribeResults;
  metadata: DeepgramTranscriptionMetadata;
};

export async function transcribeWithDeepgram(
  config: TranscriptionConfig,
  s3: ObjectStoreService,
  sourceFile: S3Locator,
  options: TranscriptionOptions,
): Promise<TranscribeWithDeepgramOutput> {
  // Create Deepgram client with API key from config
  if (config.backend.kind !== "deepgram") {
    throw new Error("Deepgram backend configuration not found");
  }

  // Create client using the new pattern from the docs
  const deepgram = createClient(config.backend.apiKey);

  // Get the model from config, or use options if provided
  const modelName = options.deepgram?.model || config.backend.model;

  // Download the audio file from S3
  const audioReadable = await s3.getObject(sourceFile);

  // Set up Deepgram options based on the documentation
  const dgOptions: PrerecordedSchema = {
    model: modelName,
    // TODO: consider using Summarize
    // TODO: consider using Topic Detection
    //       https://developers.deepgram.com/docs/topic-detection
    // TODO: consider using Intents
    detect_language: options.deepgram?.detectLanguage ?? true,
    smart_format: options.deepgram?.smartFormat ?? true,
    multichannel: options.deepgram?.multichannel ?? false,

    diarize: options.deepgram?.diarize ?? false,
    punctuate: options.deepgram?.punctuate ?? true,
    profanity_filter: options.deepgram?.profanityFilter ?? true,
    redact: options.deepgram?.redact,
    keyterm: options.deepgram?.keyterm,
    utterances: options.deepgram?.utterances ?? false,
  };

  // Send the audio to Deepgram for transcription using the new pattern
  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    audioReadable,
    dgOptions,
  );

  if (error) {
    throw new Error(`Deepgram transcription failed: ${error.message}`);
  }

  // Create the metadata with source information
  const metadata: DeepgramTranscriptionMetadata = {
    backendKind: "deepgram",
    modelName: modelName,
    deepgramMetadata: result.metadata,
    additionalInfo: {},
  };

  return {
    result: result.results,
    metadata,
  };
}
