import { type Logger } from "pino";

import {
  type Drizzle,
  type DrizzleRO,
} from "../../datastores/postgres/types.js";
import { type ObjectStoreService } from "../object-store/service.js";
import { type TemporalDispatcher } from "../temporal-dispatcher/index.js";

import { type TranscriptionConfig } from "./config.js";

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
}
