import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { mockClient } from "aws-sdk-client-mock";
import { EventBridgeDomainEventPublisher } from "../../../../src/adapters/aws/EventBridgeDomainEventPublisher";
import { APPLICATION_EVALUATED } from "../../../../src/domain/ApplicationEvent";

const eventBridgeMock = mockClient(EventBridgeClient);

describe("EventBridgeDomainEventPublisher", () => {
  beforeEach(() => {
    eventBridgeMock.reset();
  });

  it("publishes the event JSON-serialized to the configured bus with the event's eventType as DetailType", async () => {
    eventBridgeMock.on(PutEventsCommand).resolves({ FailedEntryCount: 0, Entries: [] });
    const publisher = new EventBridgeDomainEventPublisher({
      eventBusName: "credit-application-events",
      client: new EventBridgeClient({}),
    });
    const event = {
      eventId: "evt-1",
      eventType: APPLICATION_EVALUATED,
      applicationId: "APP-1",
      correlationId: "corr-1",
      result: "APPROVED" as const,
      timestamp: "2026-08-08T00:00:00.000Z",
    };

    await publisher.publish(event);

    const [call] = eventBridgeMock.commandCalls(PutEventsCommand);
    if (!call) {
      throw new Error("Expected PutEventsCommand to have been called");
    }
    const [entry] = call.args[0].input.Entries ?? [];
    if (!entry) {
      throw new Error("Expected PutEventsCommand to have been called with one entry");
    }
    expect(entry.EventBusName).toBe("credit-application-events");
    expect(entry.DetailType).toBe(APPLICATION_EVALUATED);
    expect(JSON.parse(entry.Detail as string)).toEqual(event);
  });
});
