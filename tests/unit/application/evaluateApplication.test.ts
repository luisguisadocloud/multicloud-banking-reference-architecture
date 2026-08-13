import { createApplication } from "../../../src/application/createApplication";
import { submitApplication } from "../../../src/application/submitApplication";
import { evaluateApplication } from "../../../src/application/evaluateApplication";
import {
  ApplicationNotFoundError,
  InvalidStateTransitionError,
  SimulatedEvaluationFailureError,
} from "../../../src/application/errors";
import { FORCE_FAILURE_FLAG } from "../../../src/domain/decisionEngine";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";
import { InMemoryDomainEventPublisher } from "../fakes/InMemoryDomainEventPublisher";
import { InMemoryEvaluationQueue } from "../fakes/InMemoryEvaluationQueue";

async function createAndSubmit(
  applications: InMemoryApplicationRepository,
  requestedAmount: number,
  customerReference = "CUSTOMER-001",
) {
  const draft = await createApplication(
    {
      customerReference,
      requestedAmount,
      idempotencyKey: `key-${requestedAmount}-${customerReference}`,
    },
    { applications },
  );
  return submitApplication(draft.applicationId, {
    applications,
    evaluationQueue: new InMemoryEvaluationQueue(),
  });
}

describe("evaluateApplication", () => {
  it("approves a low-amount application and publishes ApplicationEvaluated", async () => {
    const applications = new InMemoryApplicationRepository();
    const events = new InMemoryDomainEventPublisher();
    const evaluating = await createAndSubmit(applications, 5_000);

    const result = await evaluateApplication(
      {
        messageId: "msg-1",
        applicationId: evaluating.applicationId,
        correlationId: evaluating.correlationId,
      },
      { applications, events },
    );

    expect(result.status).toBe("APPROVED");
    expect(result.decision).toBe("APPROVED");
    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      eventType: "ApplicationEvaluated",
      applicationId: evaluating.applicationId,
      result: "APPROVED",
    });
  });

  it("sends a high-amount application to MANUAL_REVIEW", async () => {
    const applications = new InMemoryApplicationRepository();
    const events = new InMemoryDomainEventPublisher();
    const evaluating = await createAndSubmit(applications, 60_000);

    const result = await evaluateApplication(
      {
        messageId: "msg-2",
        applicationId: evaluating.applicationId,
        correlationId: evaluating.correlationId,
      },
      { applications, events },
    );

    expect(result.status).toBe("MANUAL_REVIEW");
  });

  it("throws SimulatedEvaluationFailureError when customerReference carries the FORCE_FAILURE test fixture, and leaves the application in EVALUATING for redelivery", async () => {
    const applications = new InMemoryApplicationRepository();
    const events = new InMemoryDomainEventPublisher();
    const evaluating = await createAndSubmit(applications, 5_000, FORCE_FAILURE_FLAG);

    await expect(
      evaluateApplication(
        {
          messageId: "msg-3",
          applicationId: evaluating.applicationId,
          correlationId: evaluating.correlationId,
        },
        { applications, events },
      ),
    ).rejects.toBeInstanceOf(SimulatedEvaluationFailureError);

    const stored = await applications.findById(evaluating.applicationId);
    expect(stored?.status).toBe("EVALUATING");
    expect(events.events).toHaveLength(0);
  });

  it("throws ApplicationNotFoundError for a non-existent application", async () => {
    const applications = new InMemoryApplicationRepository();
    const events = new InMemoryDomainEventPublisher();

    await expect(
      evaluateApplication(
        { messageId: "msg-4", applicationId: "APP-does-not-exist", correlationId: "corr-1" },
        { applications, events },
      ),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });

  it("throws InvalidStateTransitionError when the application is still DRAFT", async () => {
    const applications = new InMemoryApplicationRepository();
    const events = new InMemoryDomainEventPublisher();
    const draft = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-draft" },
      { applications },
    );

    await expect(
      evaluateApplication(
        {
          messageId: "msg-5",
          applicationId: draft.applicationId,
          correlationId: draft.correlationId,
        },
        { applications, events },
      ),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });
});
