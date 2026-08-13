import { createApplication } from "../../../src/application/createApplication";
import { submitApplication } from "../../../src/application/submitApplication";
import { evaluateApplication } from "../../../src/application/evaluateApplication";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";
import { InMemoryDomainEventPublisher } from "../fakes/InMemoryDomainEventPublisher";
import { InMemoryEvaluationQueue } from "../fakes/InMemoryEvaluationQueue";

// SC-004: redelivering the same evaluation work item twice results in exactly one recorded
// decision and no duplicate ApplicationEvaluated event.
describe("evaluateApplication idempotency", () => {
  it("does not change the decision or publish a second event on redelivery", async () => {
    const applications = new InMemoryApplicationRepository();
    const events = new InMemoryDomainEventPublisher();
    const draft = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );
    const evaluating = await submitApplication(draft.applicationId, {
      applications,
      evaluationQueue: new InMemoryEvaluationQueue(),
    });
    const message = {
      messageId: "msg-1",
      applicationId: evaluating.applicationId,
      correlationId: evaluating.correlationId,
    };

    const first = await evaluateApplication(message, { applications, events });
    const second = await evaluateApplication(message, { applications, events });

    expect(second.status).toBe(first.status);
    expect(second.decision).toBe(first.decision);
    expect(events.events).toHaveLength(1);
  });
});
