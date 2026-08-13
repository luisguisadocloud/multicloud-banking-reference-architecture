import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createApplication } from "../../../application/createApplication";
import { DynamoDbApplicationRepository } from "../DynamoDbApplicationRepository";
import { requiredEnv } from "../env";
import { errorResponse, headerValue, jsonResponse, parseJsonBody } from "../http";
import { logger } from "../logger";

// Instantiated once per execution context, reused across warm invocations.
const applications = new DynamoDbApplicationRepository({
  tableName: requiredEnv("TABLE_NAME"),
  idempotencyIndexName: requiredEnv("IDEMPOTENCY_INDEX_NAME"),
});

interface CreateApplicationRequestBody {
  customerReference: string;
  requestedAmount: number;
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const correlationId = headerValue(event, "X-Correlation-Id") ?? randomUUID();
  const logContext = { correlationId, component: "api-create", operation: "createApplication" };

  try {
    const idempotencyKey = headerValue(event, "Idempotency-Key");
    if (!idempotencyKey) {
      return jsonResponse(400, {
        errorType: "VALIDATION_ERROR",
        message: "Idempotency-Key header is required",
        correlationId,
      });
    }

    const body = parseJsonBody<CreateApplicationRequestBody>(event);
    const application = await createApplication(
      { ...body, idempotencyKey, correlationId },
      { applications },
    );

    logger.info("Application created", { ...logContext, applicationId: application.applicationId });
    return jsonResponse(201, application);
  } catch (error) {
    logger.error("Failed to create application", logContext, error);
    return errorResponse(error, correlationId);
  }
}
