import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { authorizeDocumentUpload } from "../../../application/authorizeDocumentUpload";
import { DynamoDbApplicationRepository } from "../DynamoDbApplicationRepository";
import { S3DocumentStorage } from "../S3DocumentStorage";
import { requiredEnv } from "../env";
import { errorResponse, headerValue, jsonResponse, parseJsonBody } from "../http";
import { logger } from "../logger";

const applications = new DynamoDbApplicationRepository({
  tableName: requiredEnv("TABLE_NAME"),
  idempotencyIndexName: requiredEnv("IDEMPOTENCY_INDEX_NAME"),
});
const documents = new S3DocumentStorage({ bucketName: requiredEnv("BUCKET_NAME") });

interface AuthorizeDocumentUploadRequestBody {
  type: string;
}

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
    component: "api-documents",
    operation: "authorizeDocumentUpload",
  };

  try {
    const body = parseJsonBody<AuthorizeDocumentUploadRequestBody>(event);
    const result = await authorizeDocumentUpload(
      { applicationId, documentType: body.type },
      { applications, documents },
    );

    logger.info("Document upload authorized", logContext, {
      documentId: result.documentReference.documentId,
    });
    return jsonResponse(201, { ...result.documentReference, uploadUrl: result.uploadUrl });
  } catch (error) {
    logger.error("Failed to authorize document upload", logContext, error);
    return errorResponse(error, correlationId);
  }
}
