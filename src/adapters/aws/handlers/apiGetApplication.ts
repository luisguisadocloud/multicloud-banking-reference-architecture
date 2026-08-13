import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getApplication } from "../../../application/getApplication";
import { DynamoDbApplicationRepository } from "../DynamoDbApplicationRepository";
import { requiredEnv } from "../env";
import { errorResponse, headerValue, jsonResponse } from "../http";
import { logger } from "../logger";

const applications = new DynamoDbApplicationRepository({
  tableName: requiredEnv("TABLE_NAME"),
  idempotencyIndexName: requiredEnv("IDEMPOTENCY_INDEX_NAME"),
});

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const correlationId = headerValue(event, "X-Correlation-Id") ?? randomUUID();
  const applicationId = event.pathParameters?.applicationId;

  if (!applicationId) {
    return jsonResponse(400, {
      errorType: "VALIDATION_ERROR",
      message: "applicationId path parameter is required",
      correlationId,
    });
  }

  const logContext = {
    correlationId,
    applicationId,
    component: "api-get",
    operation: "getApplication",
  };

  try {
    const application = await getApplication(applicationId, { applications });

    logger.info("Application fetched", logContext);
    return jsonResponse(200, application);
  } catch (error) {
    logger.error("Failed to fetch application", logContext, error);
    return errorResponse(error, correlationId);
  }
}
