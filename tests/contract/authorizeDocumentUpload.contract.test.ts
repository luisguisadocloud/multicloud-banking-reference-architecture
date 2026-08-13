import { createApplication } from "../../src/application/createApplication";
import { authorizeDocumentUpload } from "../../src/application/authorizeDocumentUpload";
import { InMemoryApplicationRepository } from "../unit/fakes/InMemoryApplicationRepository";
import { InMemoryDocumentStorage } from "../unit/fakes/InMemoryDocumentStorage";
import { validateResponseBody } from "./openapiValidator";

describe("Contract: POST /applications/{applicationId}/documents", () => {
  it("201 response matches the DocumentUploadAuthorization schema", async () => {
    const applications = new InMemoryApplicationRepository();
    const documents = new InMemoryDocumentStorage();
    const created = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    const result = await authorizeDocumentUpload(
      { applicationId: created.applicationId, documentType: "income-proof" },
      { applications, documents },
    );

    await validateResponseBody("authorizeDocumentUpload", "201", {
      ...result.documentReference,
      uploadUrl: result.uploadUrl,
    });
  });
});
