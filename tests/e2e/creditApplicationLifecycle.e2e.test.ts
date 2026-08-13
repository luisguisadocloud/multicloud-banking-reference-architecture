import { randomUUID } from "node:crypto";
import * as api from "./apiClient";
import { pollUntilTerminal } from "./pollUntilTerminal";

// Runs only when BASE_URL is set (e.g. `BASE_URL=<deployed-url> npm run test:e2e`) — skipped
// otherwise so `npm test` never fails for lack of a live deployment. Covers M1 User Story 1
// (specs/002-aws-reference-implementation/spec.md) and reuses unmodified against Azure/GCP once
// M2/M3 exist (FR-013/SC-002).
const describeIfBaseUrl = process.env.BASE_URL ? describe : describe.skip;

describeIfBaseUrl("E2E: credit application lifecycle", () => {
  it("completes create -> authorize upload -> submit -> reach a terminal status -> get", async () => {
    const idempotencyKey = randomUUID();
    const correlationId = randomUUID();

    const created = await api.createApplication<{ applicationId: string; status: string }>(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000 },
      idempotencyKey,
      correlationId,
    );
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("DRAFT");
    const { applicationId } = created.body;

    const authorized = await api.authorizeDocumentUpload<{ uploadUrl: string; objectKey: string }>(
      applicationId,
      "income-proof",
    );
    expect(authorized.status).toBe(201);
    expect(authorized.body.uploadUrl).toMatch(/^https:\/\//);

    const submitted = await api.submitApplication<{ status: string }>(applicationId);
    expect(submitted.status).toBe(200);
    expect(["SUBMITTED", "EVALUATING"]).toContain(submitted.body.status);

    const final = await pollUntilTerminal(applicationId);
    expect(["APPROVED", "REJECTED", "MANUAL_REVIEW"]).toContain(final.status);

    const fetched = await api.getApplication<{ status: string }>(applicationId);
    expect(fetched.status).toBe(200);
    expect(fetched.body.status).toBe(final.status);
  }, 30_000);

  it("is idempotent: repeating create with the same Idempotency-Key returns the same application", async () => {
    const idempotencyKey = randomUUID();
    const input = { customerReference: "CUSTOMER-001", requestedAmount: 5_000 };

    const first = await api.createApplication<{ applicationId: string }>(input, idempotencyKey);
    const second = await api.createApplication<{ applicationId: string }>(input, idempotencyKey);

    expect(second.body.applicationId).toBe(first.body.applicationId);
  }, 15_000);

  it("rejects a request missing the Idempotency-Key header", async () => {
    const baseUrl = process.env.BASE_URL;
    const response = await fetch(`${baseUrl}/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customerReference: "CUSTOMER-001", requestedAmount: 5_000 }),
    });

    expect(response.status).toBe(400);
  }, 15_000);
});
