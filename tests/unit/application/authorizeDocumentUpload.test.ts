import { createApplication } from "../../../src/application/createApplication";
import { submitApplication } from "../../../src/application/submitApplication";
import { authorizeDocumentUpload } from "../../../src/application/authorizeDocumentUpload";
import {
  ApplicationNotFoundError,
  InvalidStateTransitionError,
} from "../../../src/application/errors";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";
import { InMemoryDocumentStorage } from "../fakes/InMemoryDocumentStorage";
import { InMemoryEvaluationQueue } from "../fakes/InMemoryEvaluationQueue";

describe("authorizeDocumentUpload", () => {
  it("returns a DocumentReference linked to the application, an uploadUrl, and attaches the reference", async () => {
    const applications = new InMemoryApplicationRepository();
    const documents = new InMemoryDocumentStorage();
    const draft = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    const result = await authorizeDocumentUpload(
      { applicationId: draft.applicationId, documentType: "income-proof" },
      { applications, documents },
    );

    expect(result.documentReference.applicationId).toBe(draft.applicationId);
    expect(result.documentReference.type).toBe("income-proof");
    expect(result.documentReference.objectKey).toBeTruthy();
    expect(result.documentReference.uploadedAt).toBeNull();
    expect(result.uploadUrl).toBeTruthy();

    const updated = await applications.findById(draft.applicationId);
    expect(updated?.documentReferences).toContainEqual(result.documentReference);
  });

  it("rejects authorization for a non-existent application without creating a DocumentReference", async () => {
    const applications = new InMemoryApplicationRepository();
    const documents = new InMemoryDocumentStorage();

    await expect(
      authorizeDocumentUpload(
        { applicationId: "APP-does-not-exist", documentType: "income-proof" },
        { applications, documents },
      ),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });

  it("rejects authorization for an application that is no longer DRAFT", async () => {
    const applications = new InMemoryApplicationRepository();
    const documents = new InMemoryDocumentStorage();
    const draft = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );
    await submitApplication(draft.applicationId, {
      applications,
      evaluationQueue: new InMemoryEvaluationQueue(),
    });

    await expect(
      authorizeDocumentUpload(
        { applicationId: draft.applicationId, documentType: "income-proof" },
        { applications, documents },
      ),
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });
});
