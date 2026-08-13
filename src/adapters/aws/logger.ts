// Structured logging shared by every AWS Lambda handler, matching the observability contract in
// docs/07-testing-failure-observability.md (correlationId/applicationId/component/operation) and
// FR-010. CloudWatch Logs captures the Lambda runtime's stdout/stderr automatically — no SDK
// client needed here.

export interface LogContext {
  correlationId: string;
  applicationId?: string;
  component: string;
  operation?: string;
}

function write(
  level: "INFO" | "ERROR",
  message: string,
  context: LogContext,
  extra?: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...extra,
  };
  const line = JSON.stringify(entry);
  if (level === "ERROR") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, context: LogContext, extra?: Record<string, unknown>): void {
    write("INFO", message, context, extra);
  },
  error(
    message: string,
    context: LogContext,
    error: unknown,
    extra?: Record<string, unknown>,
  ): void {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error);
    write("ERROR", message, context, { errorType, errorMessage, ...extra });
  },
};
