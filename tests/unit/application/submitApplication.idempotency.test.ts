import { createApplication } from "../../../src/application/createApplication";
import { submitApplication } from "../../../src/application/submitApplication";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";
import { InMemoryEvaluationQueue } from "../fakes/InMemoryEvaluationQueue";

// FR-006: resubmitting an already-submitted application must not enqueue a second effective
// evaluation.
describe("submitApplication idempotency", () => {
  it("does not enqueue a second evaluation when submit is called twice", async () => {
    const applications = new InMemoryApplicationRepository();
    const evaluationQueue = new InMemoryEvaluationQueue();
    const draft = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    const first = await submitApplication(draft.applicationId, { applications, evaluationQueue });
    const second = await submitApplication(draft.applicationId, { applications, evaluationQueue });

    expect(first.status).toBe("EVALUATING");
    expect(second.status).toBe("EVALUATING");
    expect(evaluationQueue.messages).toHaveLength(1);
  });
});
