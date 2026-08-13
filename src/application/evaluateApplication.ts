import { randomUUID } from "node:crypto";
import type { ApplicationRepository } from "../ports/ApplicationRepository";
import type { DomainEventPublisher } from "../ports/DomainEventPublisher";
import type { EvaluateApplication as EvaluateApplicationMessage } from "../domain/EvaluateApplication";
import type { CreditApplication } from "../domain/CreditApplication";
import { canEvaluate, isTerminalStatus } from "../domain/applicationStateMachine";
import { decide, computeFictitiousRiskScore, FORCE_FAILURE_FLAG } from "../domain/decisionEngine";
import { APPLICATION_EVALUATED } from "../domain/ApplicationEvent";
import {
  ApplicationNotFoundError,
  InvalidStateTransitionError,
  SimulatedEvaluationFailureError,
} from "./errors";

export interface EvaluateApplicationDeps {
  applications: ApplicationRepository;
  events: DomainEventPublisher;
}

/**
 * The FORCE_FAILURE test fixture is carried in `customerReference` (per
 * docs/01-business-case.md: "puede existir un campo... como FORCE_FAILURE"), not as a function
 * parameter — a real deployment's worker (e.g. an SQS-triggered Lambda) has no way to receive an
 * out-of-band test parameter, only the persisted application data. Test fixtures set
 * `customerReference` to this value; it never appears in production-shaped domain data. Throwing
 * here — instead of feeding it into decide() as a business outcome — simulates a technical
 * evaluation failure: nothing is persisted, so the application stays in EVALUATING and every SQS
 * redelivery hits this same throw, until maxReceiveCount routes the message to the DLQ (spec
 * 002-aws-reference-implementation, User Story 2).
 */
export async function evaluateApplication(
  message: EvaluateApplicationMessage,
  deps: EvaluateApplicationDeps,
): Promise<CreditApplication> {
  const application = await deps.applications.findById(message.applicationId);
  if (!application) {
    throw new ApplicationNotFoundError(message.applicationId);
  }

  // FR-007: redelivery of an already-evaluated work item is an idempotent no-op — the recorded
  // decision does not change and no duplicate event is published.
  if (isTerminalStatus(application.status)) {
    return application;
  }

  if (!canEvaluate(application.status)) {
    throw new InvalidStateTransitionError(
      `Cannot evaluate application ${application.applicationId} in status ${application.status}`,
    );
  }

  if (application.customerReference === FORCE_FAILURE_FLAG) {
    throw new SimulatedEvaluationFailureError(application.applicationId);
  }

  const decision = decide(application.requestedAmount);
  const evaluatedAt = new Date().toISOString();
  const evaluated: CreditApplication = {
    ...application,
    status: decision,
    decision,
    riskScore: computeFictitiousRiskScore(application.requestedAmount),
    updatedAt: evaluatedAt,
    version: application.version + 1,
  };
  await deps.applications.save(evaluated);

  await deps.events.publish({
    eventId: randomUUID(),
    eventType: APPLICATION_EVALUATED,
    applicationId: evaluated.applicationId,
    correlationId: evaluated.correlationId,
    result: decision,
    timestamp: evaluatedAt,
  });

  return evaluated;
}
