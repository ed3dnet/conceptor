import { eq } from "drizzle-orm";
import { type Logger } from "pino";

import { TRANSCRIPTION_JOBS } from "../../../_db/schema/index.js";
import { TenantIds } from "../../../domain/tenants/id.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../../datastores/postgres/types.js";
import { type ObjectStoreService } from "../object-store/service.js";
import { type S3Locator } from "../object-store/types.js";
import { type TemporalDispatcher } from "../temporal-dispatcher/index.js";

import { type TranscriptionConfig } from "./config.js";
import { TranscriptionJobIds } from "./id.js";
import {
  type CreateTranscriptionJobInput,
  type CreateTranscriptionJobOutput,
  type TranscriptionOptions,
} from "./schemas.js";
import {
  processTranscriptionJob,
  type ProcessTranscriptionJobInput,
} from "./workflows/process-transcription.js";

export class TranscriptionService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly config: TranscriptionConfig,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly temporalDispatcher: TemporalDispatcher,
    private readonly s3: ObjectStoreService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  /**
   * Creates a new transcription job and starts the workflow to process it
   */
  async createTranscriptionJob(
    input: CreateTranscriptionJobInput,
  ): Promise<CreateTranscriptionJobOutput> {
    this.logger.info("Creating transcription job", {
      tenantId: input.tenantId,
      sourceFile: input.sourceFile,
    });

    const [job] = await this.db
      .insert(TRANSCRIPTION_JOBS)
      .values({
        tenantId: TenantIds.toUUID(input.tenantId),
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
        tenantId: TenantIds.toRichId(job.tenantId),
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
          eq(TRANSCRIPTION_JOBS.transcriptionJobId, job.transcriptionJobId),
        );
      throw err;
    }

    return {
      transcriptionJobId: TranscriptionJobIds.toRichId(job.transcriptionJobId),
    };
  }
}
