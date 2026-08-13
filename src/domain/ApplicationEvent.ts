import type { Decision } from "./CreditApplication";

export const APPLICATION_EVALUATED = "ApplicationEvaluated" as const;

export interface ApplicationEvaluatedEvent {
  eventId: string;
  eventType: typeof APPLICATION_EVALUATED;
  applicationId: string;
  correlationId: string;
  result: Decision;
  timestamp: string;
}

export type ApplicationEvent = ApplicationEvaluatedEvent;
