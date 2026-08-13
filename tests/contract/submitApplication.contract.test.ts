import { createApplication } from "../../src/application/createApplication";
import { submitApplication } from "../../src/application/submitApplication";
import { InMemoryApplicationRepository } from "../unit/fakes/InMemoryApplicationRepository";
import { InMemoryEvaluationQueue } from "../unit/fakes/InMemoryEvaluationQueue";
import { validateResponseBody } from "./openapiValidator";

describe("Contract: POST /applications/{applicationId}/submit", () => {
  it("200 response matches the CreditApplication schema", async () => {
    const applications = new InMemoryApplicationRepository();
    const evaluationQueue = new InMemoryEvaluationQueue();
    const created = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    const submitted = await submitApplication(created.applicationId, {
      applications,
      evaluationQueue,
    });

    await validateResponseBody("submitApplication", "200", submitted);
  });
});
