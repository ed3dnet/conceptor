import { type JetStreamClient, type NatsConnection } from "nats";
import { type Logger } from "pino";

import { type EventDispatchConfig } from "./config.js";

export class EventDispatchService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly config: EventDispatchConfig,
    private readonly natsJetstream: JetStreamClient,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }

  /**
   * Publishes an event to the configured stream
   * @param subject The specific subject within the stream
   * @param payload The event payload to publish
   * @returns The sequence number of the published message
   */
  async publishEvent<T extends object>(
    subject: string,
    payload: T,
  ): Promise<number> {
    const fullSubject = `${this.config.streamName}.${subject}`;

    this.logger.debug({ subject: fullSubject, payload }, "Publishing event");

    try {
      const pubAck = await this.natsJetstream.publish(
        fullSubject,
        this.encodePayload(payload),
      );

      this.logger.debug(
        {
          subject: fullSubject,
          sequence: pubAck.seq,
          stream: pubAck.stream,
        },
        "Event published successfully",
      );

      return pubAck.seq;
    } catch (error) {
      this.logger.error(
        { error, subject: fullSubject },
        "Failed to publish event",
      );
      throw error;
    }
  }

  /**
   * Encodes a payload object to a Uint8Array for NATS transmission
   */
  private encodePayload<T extends object>(payload: T): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(payload));
  }
}
