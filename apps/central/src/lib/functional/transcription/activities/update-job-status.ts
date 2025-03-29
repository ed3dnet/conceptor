import { and, eq } from "drizzle-orm";
import { type PgUpdateSetSource } from "drizzle-orm/pg-core";

import { TRANSCRIPTION_JOBS } from "../../../../_db/schema/index.js";
import { activity } from "../../../../_worker/activity-helpers.js";
import { TenantIds } from "../../../../domain/tenants/id.js";
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
        tenantId: input.tenantId,
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

      // Convert IDs to UUIDs for database operations
      const transcriptionJobUuid = TranscriptionJobIds.toUUID(
        input.transcriptionJobId,
      );
      const tenantUuid = TenantIds.toUUID(input.tenantId);

      // Update the job in the database with tenant isolation
      await db
        .update(TRANSCRIPTION_JOBS)
        .set(updateData)
        .where(
          and(
            eq(TRANSCRIPTION_JOBS.transcriptionJobId, transcriptionJobUuid),
            eq(TRANSCRIPTION_JOBS.tenantId, tenantUuid),
          ),
        );

      logger.debug("Successfully updated transcription job status", {
        transcriptionJobId: input.transcriptionJobId,
        tenantId: input.tenantId,
        status: input.status,
      });
    },
  },
);
