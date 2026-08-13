import type { EventBridgeEvent } from "aws-lambda";
import type { ApplicationEvaluatedEvent } from "../../../domain/ApplicationEvent";
import { logger } from "../logger";

// Simplified audit trail — not a full regulatory audit system (docs/architecture/02-logical-architecture.md:
// "No construir un sistema regulatorio completo"). Logging the event with correlationId is enough
// for this lab to demonstrate the audit fan-out from EventBridge.
export async function handler(
  event: EventBridgeEvent<"ApplicationEvaluated", ApplicationEvaluatedEvent>,
): Promise<void> {
  const detail = event.detail;
  logger.info(
    "Audit: application evaluated",
    {
      correlationId: detail.correlationId,
      applicationId: detail.applicationId,
      component: "event-audit",
      operation: "auditApplicationEvaluated",
    },
    { result: detail.result, eventId: detail.eventId },
  );
}
