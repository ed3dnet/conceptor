import {
  type DeepgramTranscribeResults,
  type DeepgramTranscriptionMetadata,
} from "../../activities/schemas/deepgram.js";
import {
  type NormalizedTranscriptionResult,
  type TranscriptionWord,
} from "../../activities/schemas/index.js";

export function normalizeDeepgramResult(
  results: DeepgramTranscribeResults,
  metadata: DeepgramTranscriptionMetadata,
): NormalizedTranscriptionResult {
  // Extract the full transcript from the first channel and alternative
  const transcriptionText =
    results.channels[0]?.alternatives[0]?.transcript || "";

  // Extract and normalize words
  const words: TranscriptionWord[] = [];

  // If we have utterances with speaker information, use those
  if (results.utterances && results.utterances.length > 0) {
    for (const utterance of results.utterances) {
      for (const word of utterance.words) {
        words.push({
          text: word.punctuated_word || word.word,
          startTime: word.start,
          endTime: word.end,
          confidence: word.confidence,
          speaker: word.speaker,
          channel: utterance.channel,
        });
      }
    }
  }
  // Otherwise use the words from the first channel and alternative
  else if (results.channels[0]?.alternatives[0]?.words) {
    const channelWords = results.channels[0].alternatives[0].words;
    for (const word of channelWords) {
      words.push({
        text: word.punctuated_word || word.word,
        startTime: word.start,
        endTime: word.end,
        confidence: word.confidence,
        speaker: word.speaker,
        channel: 0, // Default to channel 0 when not specified
      });
    }
  }

  return {
    transcriptionText,
    words,
    metadata,
    originalResult: {
      kind: "deepgram",
      results,
    },
  };
}
