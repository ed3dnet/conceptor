import { eq } from "drizzle-orm";
import { type PgUpdateSetSource } from "drizzle-orm/pg-core";

import { TRANSCRIPTION_JOBS } from "../../../../_db/schema/index.js";
import { activity } from "../../../../_worker/activity-helpers.js";
import { TranscriptionJobIds } from "../id.js";

import { type UpdateTranscriptionJobStatusInput } from "./schemas/index.js";

export const updateJobTranscriptionStatusActivity = activity(
  "updateTranscriptionJobStatus",
  {
    fn: async (
      _context,
      logger,
      deps,
      input: UpdateTranscriptionJobStatusInput,
    ): Promise<void> => {
      const { db } = deps;

      logger.debug("Updating transcription job status", {
        transcriptionJobId: input.transcriptionJobId,
        status: input.status,
      });

      // Build the update object based on the status
      const updateData: PgUpdateSetSource<typeof TRANSCRIPTION_JOBS> = {
        status: input.status,
      };

      // Add status-specific fields
      if (input.status === "completed") {
        updateData.transcriptionText = input.transcriptionText;
        updateData.transcriptionMetadata = input.transcriptionMetadata;
      } else if (input.status === "failed") {
        updateData.errorMessage = input.errorMessage;
        updateData.transcriptionMetadata = {};
      }

      // Update the job in the database
      await db
        .update(TRANSCRIPTION_JOBS)
        .set(updateData)
        .where(
          eq(
            TRANSCRIPTION_JOBS.transcriptionJobId,
            TranscriptionJobIds.toUUID(input.transcriptionJobId),
          ),
        );

      logger.debug("Successfully updated transcription job status", {
        transcriptionJobId: input.transcriptionJobId,
        status: input.status,
      });
    },
  },
);
