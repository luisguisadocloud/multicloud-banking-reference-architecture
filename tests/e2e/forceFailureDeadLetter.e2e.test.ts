import { randomUUID } from "node:crypto";
import { ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import * as api from "./apiClient";
import { FORCE_FAILURE_FLAG } from "../../src/domain/decisionEngine";

// Covers M1 User Story 2 (specs/002-aws-reference-implementation/spec.md): a message that always
// fails evaluation must reach the dead-letter queue within the configured maxReceiveCount
// (FR-006, SC-004). Requires BASE_URL (the deployed API) and DLQ_URL (Terraform output
// `sqs_dlq_url`) — skipped when either is absent, and requires local AWS credentials to inspect
// the queue directly (the same profile used for `terraform apply`).
const describeIfConfigured = process.env.BASE_URL && process.env.DLQ_URL ? describe : describe.skip;

describeIfConfigured("E2E: failure engineering - dead-letter queue", () => {
  it("moves a message that always fails evaluation into the DLQ within maxReceiveCount", async () => {
    const idempotencyKey = randomUUID();
    const created = await api.createApplication<{ applicationId: string }>(
      { customerReference: FORCE_FAILURE_FLAG, requestedAmount: 5_000 },
      idempotencyKey,
    );
    const { applicationId } = created.body;

    await api.submitApplication(applicationId);

    const sqs = new SQSClient({});
    const dlqUrl = process.env.DLQ_URL as string;
    const deadline = Date.now() + 60_000;
    let foundInDlq = false;

    while (Date.now() < deadline && !foundInDlq) {
      const result = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: dlqUrl,
          WaitTimeSeconds: 5,
          MaxNumberOfMessages: 10,
        }),
      );
      foundInDlq = (result.Messages ?? []).some((message) => message.Body?.includes(applicationId));
      if (!foundInDlq) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }

    expect(foundInDlq).toBe(true);
  }, 65_000);
});
