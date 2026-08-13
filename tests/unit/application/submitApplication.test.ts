import { createApplication } from "../../../src/application/createApplication";
import { submitApplication } from "../../../src/application/submitApplication";
import { ApplicationNotFoundError } from "../../../src/application/errors";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";
import { InMemoryEvaluationQueue } from "../fakes/InMemoryEvaluationQueue";

describe("submitApplication", () => {
  it("transitions a DRAFT application through SUBMITTED to EVALUATING and enqueues work", async () => {
    const applications = new InMemoryApplicationRepository();
    const evaluationQueue = new InMemoryEvaluationQueue();
    const draft = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    const result = await submitApplication(draft.applicationId, { applications, evaluationQueue });

    expect(result.status).toBe("EVALUATING");
    expect(applications.history.map((snapshot) => snapshot.status)).toEqual([
      "DRAFT",
      "SUBMITTED",
      "EVALUATING",
    ]);
    expect(evaluationQueue.messages).toHaveLength(1);
    expect(evaluationQueue.messages[0]).toMatchObject({
      applicationId: draft.applicationId,
      correlationId: draft.correlationId,
    });
  });

  it("throws ApplicationNotFoundError for a non-existent application", async () => {
    const applications = new InMemoryApplicationRepository();
    const evaluationQueue = new InMemoryEvaluationQueue();

    await expect(
      submitApplication("APP-does-not-exist", { applications, evaluationQueue }),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });
});
