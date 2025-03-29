import { type Logger } from "pino";

import {
  type Drizzle,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.js";
import { type EventService } from "../events/service.js";
import { type TenantId } from "../tenants/id.js";

import { AskResponseSubservice } from "./subservices/ask-response-subservice.js";
import { AskSubservice } from "./subservices/ask-subservice.js";

/**
 * QuestionsService orchestrates the management of Asks, AskReferences, and AskResponses.
 * It delegates specific operations to specialized subservices.
 */
export class QuestionsService {
  private readonly logger: Logger;
  private _askSubservice?: AskSubservice;
  private _askResponseSubservice?: AskResponseSubservice;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({
      component: this.constructor.name,
      tenantId,
    });
    this.logger.debug("QuestionsService initialized");
  }

  /**
   * Lazily instantiates and returns the AskSubservice
   */
  get asks(): AskSubservice {
    if (!this._askSubservice) {
      this._askSubservice = new AskSubservice(
        this.logger,
        this.db,
        this.dbRO,
        this.events,
        this.tenantId,
      );
    }
    return this._askSubservice;
  }

  /**
   * Lazily instantiates and returns the AskResponseSubservice
   */
  get responses(): AskResponseSubservice {
    if (!this._askResponseSubservice) {
      this._askResponseSubservice = new AskResponseSubservice(
        this.logger,
        this.db,
        this.dbRO,
        this.events,
        this.tenantId,
      );
    }
    return this._askResponseSubservice;
  }
}
