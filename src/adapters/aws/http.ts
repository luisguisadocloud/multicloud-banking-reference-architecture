import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import {
  ApplicationNotFoundError,
  InvalidApplicationRequestError,
  InvalidStateTransitionError,
} from "../../application/errors";

const JSON_HEADERS = { "content-type": "application/json" };

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export function parseJsonBody<T>(event: APIGatewayProxyEventV2): T {
  if (!event.body) {
    throw new InvalidApplicationRequestError("Request body is required");
  }
  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new InvalidApplicationRequestError("Request body must be valid JSON");
  }
}

/** API Gateway HTTP API (payload format 2.0) normalizes header names to lowercase. */
export function headerValue(event: APIGatewayProxyEventV2, name: string): string | undefined {
  return event.headers?.[name.toLowerCase()];
}

export function errorResponse(
  error: unknown,
  correlationId: string,
): APIGatewayProxyStructuredResultV2 {
  if (error instanceof ApplicationNotFoundError) {
    return jsonResponse(404, { errorType: "NOT_FOUND", message: error.message, correlationId });
  }
  if (
    error instanceof InvalidApplicationRequestError ||
    error instanceof InvalidStateTransitionError
  ) {
    return jsonResponse(400, {
      errorType: "VALIDATION_ERROR",
      message: error.message,
      correlationId,
    });
  }
  return jsonResponse(500, {
    errorType: "INTERNAL_ERROR",
    message: "Unexpected error",
    correlationId,
  });
}
