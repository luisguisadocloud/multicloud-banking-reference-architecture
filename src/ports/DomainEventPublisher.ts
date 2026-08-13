import type { ApplicationEvent } from "../domain/ApplicationEvent";

export interface DomainEventPublisher {
  publish(event: ApplicationEvent): Promise<void>;
}
