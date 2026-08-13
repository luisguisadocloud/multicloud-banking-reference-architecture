import type { EventBridgeEvent } from "aws-lambda";
import type { ApplicationEvaluatedEvent } from "../../../domain/ApplicationEvent";
import { logger } from "../logger";

// Mock notification — no real email/SMS integration for V1 (docs/01-business-case.md:
// "Para V1 puede ser un mock/log de notificación... si no aporta aprendizaje multi-cloud
// relevante"). Logging what would have been sent is sufficient here.
export async function handler(
  event: EventBridgeEvent<"ApplicationEvaluated", ApplicationEvaluatedEvent>,
): Promise<void> {
  const detail = event.detail;
  logger.info(
    "Notification (mock): would notify customer of application decision",
    {
      correlationId: detail.correlationId,
      applicationId: detail.applicationId,
      component: "event-notification",
      operation: "notifyApplicationEvaluated",
    },
    { result: detail.result },
  );
}
