import { type Logger } from "pino";

import { type TemporalDispatcher } from "../../lib/functional/temporal-dispatcher/index.js";

import { EVENT_LISTENERS } from "./event-listeners.js";
import { EVENT_REGISTRY, EventHandler } from "./event-registry.js";
import { type AnyEvent } from "./event-registry.js";

export class EventService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly temporalDispatch: TemporalDispatcher,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  async dispatchEvent(event: AnyEvent): Promise<void> {
    const eventType = event.__type;
    const logger = this.logger.child({
      fn: this.dispatchEvent.name,
      eventType,
    });

    logger.debug({ event }, "Dispatching event");

    // Validate the event against its schema
    const registryEntry = EVENT_REGISTRY[eventType];
    if (!registryEntry) {
      logger.warn("Unknown event type received");
      return;
    }

    // Check if the event is valid according to its schema
    if (!registryEntry.checker.Check(event)) {
      logger.warn(
        { errors: registryEntry.checker.Errors(event) },
        "Invalid event payload",
      );
      return;
    }

    // Get listeners for this event type
    const listeners = EVENT_LISTENERS[eventType] || [];
    if (listeners.length === 0) {
      logger.debug("No listeners registered for this event type");
      return;
    }

    // Dispatch to all listeners
    const dispatchPromises = listeners.map(async ({ name, handler }) => {
      try {
        logger.debug({ listenerName: name }, "Dispatching event to listener");

        // @ts-expect-error - we know the handler is the correct type
        // this is hard to actually prove here but we are statically registering
        // handlers in `event-listeners.ts` and the type system knows that the
        // handler is the correct type there.
        // TODO: if we ever add dynamic handlers, this is insufficient
        await this.temporalDispatch.startCore(handler, [event]);

        logger.debug(
          { listenerName: name },
          "Successfully dispatched event to listener",
        );
      } catch (error) {
        logger.error(
          { listenerName: name, error },
          "Error dispatching event to listener",
        );
      }
    });

    await Promise.all(dispatchPromises);
    logger.debug(`Event dispatched to ${listeners.length} listeners`);
  }
}
