import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from "aws-lambda";
import { evaluateApplication } from "../../../application/evaluateApplication";
import type { EvaluateApplication } from "../../../domain/EvaluateApplication";
import { DynamoDbApplicationRepository } from "../DynamoDbApplicationRepository";
import { EventBridgeDomainEventPublisher } from "../EventBridgeDomainEventPublisher";
import { requiredEnv } from "../env";
import { logger } from "../logger";

const applications = new DynamoDbApplicationRepository({
  tableName: requiredEnv("TABLE_NAME"),
  idempotencyIndexName: requiredEnv("IDEMPOTENCY_INDEX_NAME"),
});
const events = new EventBridgeDomainEventPublisher({ eventBusName: requiredEnv("EVENT_BUS_NAME") });
const secretsClient = new SecretsManagerClient({});

// Practicing Secrets Manager retrieval + IAM (docs/architecture/03-aws.md, data-model.md's
// Secrets Manager section) — a real risk engine integration would use this value. The M0 decision
// engine itself stays local and deterministic (docs/01-business-case.md: fictitious, never a
// real credit model); this call exists to exercise the identity/secret-retrieval pattern, not to
// influence the decision. Cached across warm invocations.
let cachedRiskEngineApiKey: string | undefined;

async function ensureRiskEngineApiKeyIsReadable(): Promise<void> {
  if (cachedRiskEngineApiKey !== undefined) return;
  const result = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: requiredEnv("SECRET_ARN") }),
  );
  cachedRiskEngineApiKey = result.SecretString ?? "";
}

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    let message: EvaluateApplication | undefined;
    try {
      message = JSON.parse(record.body) as EvaluateApplication;
    } catch (error) {
      logger.error(
        "Poison message: SQS record body is not valid JSON",
        {
          correlationId: "unknown",
          component: "worker-evaluate",
          operation: "evaluateApplication",
        },
        error,
        { messageId: record.messageId },
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    const logContext = {
      correlationId: message.correlationId,
      applicationId: message.applicationId,
      component: "worker-evaluate",
      operation: "evaluateApplication",
    };

    try {
      await ensureRiskEngineApiKeyIsReadable();
      const application = await evaluateApplication(message, { applications, events });
      logger.info("Application evaluated", logContext, { result: application.decision });
    } catch (error) {
      logger.error("Failed to evaluate application", logContext, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
