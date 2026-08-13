import type { DomainEventPublisher } from "../../../src/ports/DomainEventPublisher";
import type { ApplicationEvent } from "../../../src/domain/ApplicationEvent";

export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  public readonly events: ApplicationEvent[] = [];

  async publish(event: ApplicationEvent): Promise<void> {
    this.events.push(event);
  }
}
