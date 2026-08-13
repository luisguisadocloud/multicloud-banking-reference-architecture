import { createApplication } from "../../../src/application/createApplication";
import { submitApplication } from "../../../src/application/submitApplication";
import { evaluateApplication } from "../../../src/application/evaluateApplication";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";
import { InMemoryDomainEventPublisher } from "../fakes/InMemoryDomainEventPublisher";
import { InMemoryEvaluationQueue } from "../fakes/InMemoryEvaluationQueue";

// FR-010: correlationId propagates end-to-end from create through submit, the enqueued work item,
// evaluate, and the resulting domain event.
describe("correlationId propagation", () => {
  it("carries a client-supplied correlationId through the entire lifecycle", async () => {
    const applications = new InMemoryApplicationRepository();
    const evaluationQueue = new InMemoryEvaluationQueue();
    const events = new InMemoryDomainEventPublisher();

    const created = await createApplication(
      {
        customerReference: "CUSTOMER-001",
        requestedAmount: 5_000,
        idempotencyKey: "key-1",
        correlationId: "corr-abc-123",
      },
      { applications },
    );
    expect(created.correlationId).toBe("corr-abc-123");

    const submitted = await submitApplication(created.applicationId, {
      applications,
      evaluationQueue,
    });
    expect(submitted.correlationId).toBe("corr-abc-123");

    const [enqueuedMessage] = evaluationQueue.messages;
    expect(enqueuedMessage).toBeDefined();
    expect(enqueuedMessage?.correlationId).toBe("corr-abc-123");

    const evaluated = await evaluateApplication(enqueuedMessage!, { applications, events });
    expect(evaluated.correlationId).toBe("corr-abc-123");

    const [publishedEvent] = events.events;
    expect(publishedEvent?.correlationId).toBe("corr-abc-123");
  });

  it("generates a correlationId when the client does not supply one, and still propagates it", async () => {
    const applications = new InMemoryApplicationRepository();
    const evaluationQueue = new InMemoryEvaluationQueue();
    const events = new InMemoryDomainEventPublisher();

    const created = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-2" },
      { applications },
    );
    expect(created.correlationId).toBeTruthy();

    const submitted = await submitApplication(created.applicationId, {
      applications,
      evaluationQueue,
    });
    const [enqueuedMessage] = evaluationQueue.messages;
    const evaluated = await evaluateApplication(enqueuedMessage!, { applications, events });
    const [publishedEvent] = events.events;

    expect(submitted.correlationId).toBe(created.correlationId);
    expect(evaluated.correlationId).toBe(created.correlationId);
    expect(publishedEvent?.correlationId).toBe(created.correlationId);
  });
});
