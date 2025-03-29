import { and, eq } from "drizzle-orm";
import { type Logger } from "pino";

import { TRANSCRIPTION_JOBS } from "../../../_db/schema/index.js";
import { TenantIds, type TenantId } from "../../../domain/tenants/id.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../datastores/postgres/types.js";
import { type StringUUID } from "../../ext/typebox/index.js";
import { type ObjectStoreService } from "../object-store/service.js";
import { type TemporalDispatcher } from "../temporal-dispatcher/index.js";

import { type TranscriptionConfig } from "./config.js";
import { TranscriptionJobIds } from "./id.js";
import {
  type CreateTranscriptionJobInput,
  type CreateTranscriptionJobOutput,
} from "./schemas.js";
import {
  processTranscriptionJob,
  type ProcessTranscriptionJobInput,
} from "./workflows/process-transcription.js";

export class TranscriptionService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly config: TranscriptionConfig,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly temporalDispatcher: TemporalDispatcher,
    private readonly s3: ObjectStoreService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  /**
   * Creates a new transcription job and starts the workflow to process it
   */
  async createTranscriptionJob(
    input: CreateTranscriptionJobInput,
  ): Promise<CreateTranscriptionJobOutput> {
    this.logger.info("Creating transcription job", {
      sourceFile: input.sourceFile,
    });

    // Ensure the tenantId in the input matches the service's tenantId
    if (input.tenantId !== this.tenantId) {
      throw new Error("TenantId mismatch in transcription job creation");
    }

    const [job] = await this.db
      .insert(TRANSCRIPTION_JOBS)
      .values({
        tenantId: this.tenantUuid,
        sourceBucket: input.sourceFile.bucket,
        sourceObjectName: input.sourceFile.objectName,
        options: input.options,
        status: "pending",
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create transcription job");
    }

    try {
      const workflowInput: ProcessTranscriptionJobInput = {
        transcriptionJobId: TranscriptionJobIds.toRichId(
          job.transcriptionJobId,
        ),
        tenantId: this.tenantId,
        sourceFile: input.sourceFile,
        options: input.options,
      };
      await this.temporalDispatcher.startMedia(processTranscriptionJob, [
        workflowInput,
      ]);
    } catch (err) {
      this.logger.error("Failed to create transcription job", err);
      await this.db
        .delete(TRANSCRIPTION_JOBS)
        .where(
          and(
            eq(TRANSCRIPTION_JOBS.transcriptionJobId, job.transcriptionJobId),
            eq(TRANSCRIPTION_JOBS.tenantId, this.tenantUuid),
          ),
        );
      throw err;
    }

    return {
      transcriptionJobId: TranscriptionJobIds.toRichId(job.transcriptionJobId),
    };
  }
}
