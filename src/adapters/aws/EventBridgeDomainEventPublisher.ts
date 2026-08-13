import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import type { DomainEventPublisher } from "../../ports/DomainEventPublisher";
import type { ApplicationEvent } from "../../domain/ApplicationEvent";

export interface EventBridgeDomainEventPublisherConfig {
  eventBusName: string;
  /** EventBridge `Source` field for events emitted by this platform. */
  source?: string;
  client?: EventBridgeClient;
}

export class EventBridgeDomainEventPublisher implements DomainEventPublisher {
  private readonly eventBusName: string;
  private readonly source: string;
  private readonly client: EventBridgeClient;

  constructor(config: EventBridgeDomainEventPublisherConfig) {
    this.eventBusName = config.eventBusName;
    this.source = config.source ?? "credit-application-platform";
    this.client = config.client ?? new EventBridgeClient({});
  }

  async publish(event: ApplicationEvent): Promise<void> {
    await this.client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: this.eventBusName,
            Source: this.source,
            DetailType: event.eventType,
            Detail: JSON.stringify(event),
          },
        ],
      }),
    );
  }
}
