import * as workflow from "@temporalio/workflow";

import { type TenantId } from "../../../../domain/tenants/id.js";
import { type S3Locator } from "../../object-store/types.js";
import { type handleTranscriptionActivity } from "../activities/handle-transcription.js";
import { type normalizeTranscriptionActivity } from "../activities/normalize-transcription.js";
import { type signalWorkflowFromTranscriptionActivity } from "../activities/signal-workflow.js";
import { type updateJobTranscriptionStatusActivity } from "../activities/update-job-status.js";
import { type TranscriptionJobId } from "../id.js";
import { type TranscriptionOptions } from "../schemas.js";

// We'll define these activities later
const {
  updateTranscriptionJobStatus,
  handleTranscription,
  normalizeTranscription,
  signalWorkflowFromTranscription,
} = workflow.proxyActivities<{
  updateTranscriptionJobStatus: (typeof updateJobTranscriptionStatusActivity)["activity"];
  handleTranscription: (typeof handleTranscriptionActivity)["activity"];
  normalizeTranscription: (typeof normalizeTranscriptionActivity)["activity"];
  signalWorkflowFromTranscription: (typeof signalWorkflowFromTranscriptionActivity)["activity"];
}>({
  startToCloseTimeout: "1 hour",
});

export interface ProcessTranscriptionJobInput {
  transcriptionJobId: TranscriptionJobId;
  tenantId: TenantId;
  sourceFile: S3Locator;
  options: TranscriptionOptions;
}

export async function processTranscriptionJob(
  input: ProcessTranscriptionJobInput,
): Promise<void> {
  workflow.log.info("Starting transcription job workflow", {
    transcriptionJobId: input.transcriptionJobId,
  });

  try {
    // Update job status to processing
    await updateTranscriptionJobStatus({
      transcriptionJobId: input.transcriptionJobId,
      status: "processing",
    });

    // Perform the transcription
    const rawResult = await handleTranscription({
      transcriptionJobId: input.transcriptionJobId,
      sourceFile: input.sourceFile,
      options: input.options,
    });

    // Normalize the backend-specific result into a standard format
    const normalizedResult = await normalizeTranscription({
      backend: rawResult.backend,
      result: rawResult.result,
    });

    workflow.log.info("Transcription completed successfully", {
      transcriptionJobId: input.transcriptionJobId,
      backend: rawResult.backend,
    });

    // Update job with successful result
    await updateTranscriptionJobStatus({
      transcriptionJobId: input.transcriptionJobId,
      status: "completed",
      transcriptionText: normalizedResult.transcriptionText,
      transcriptionMetadata: normalizedResult.metadata,
    });

    // Signal the requesting workflow if configured
    const temporalSignal = input.options.app?.temporalSignal;
    if (temporalSignal) {
      await signalWorkflowFromTranscription({
        transcriptionJobId: input.transcriptionJobId,
        signal: temporalSignal,
        event: {
          kind: "transcriptionComplete",
          transcriptionJobId: input.transcriptionJobId,
          transcriptionText: normalizedResult.transcriptionText,
          metadata: normalizedResult.metadata,
        },
      });
    }
  } catch (err) {
    workflow.log.error("Transcription job failed", {
      transcriptionJobId: input.transcriptionJobId,
      error: err instanceof Error ? err.message : String(err),
    });

    // Update job with failure status
    await updateTranscriptionJobStatus({
      transcriptionJobId: input.transcriptionJobId,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    // Signal failure if configured
    const temporalSignal = input.options.app?.temporalSignal;
    if (temporalSignal) {
      await signalWorkflowFromTranscription({
        transcriptionJobId: input.transcriptionJobId,
        signal: temporalSignal,
        event: {
          kind: "transcriptionFailed",
          jobId: input.transcriptionJobId,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    }

    // Re-throw to mark the workflow as failed
    throw err;
  }

  workflow.log.info("Transcription workflow completed", {
    jobId: input.transcriptionJobId,
  });
}
