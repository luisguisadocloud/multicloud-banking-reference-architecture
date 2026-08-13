import { randomUUID } from "node:crypto";
import type { ApplicationRepository } from "../ports/ApplicationRepository";
import type { EvaluationQueue } from "../ports/EvaluationQueue";
import type { CreditApplication } from "../domain/CreditApplication";
import { canSubmit } from "../domain/applicationStateMachine";
import { ApplicationNotFoundError } from "./errors";

export interface SubmitApplicationDeps {
  applications: ApplicationRepository;
  evaluationQueue: EvaluationQueue;
}

export async function submitApplication(
  applicationId: string,
  deps: SubmitApplicationDeps,
): Promise<CreditApplication> {
  const application = await deps.applications.findById(applicationId);
  if (!application) {
    throw new ApplicationNotFoundError(applicationId);
  }

  // FR-006: resubmitting an application that already left DRAFT is an idempotent no-op — it must
  // not enqueue a second effective evaluation.
  if (!canSubmit(application.status)) {
    return application;
  }

  const submittedAt = new Date().toISOString();
  const submitted: CreditApplication = {
    ...application,
    status: "SUBMITTED",
    updatedAt: submittedAt,
    version: application.version + 1,
  };
  await deps.applications.save(submitted);

  const evaluating: CreditApplication = {
    ...submitted,
    status: "EVALUATING",
    version: submitted.version + 1,
  };
  await deps.applications.save(evaluating);

  await deps.evaluationQueue.enqueue({
    messageId: randomUUID(),
    applicationId: evaluating.applicationId,
    correlationId: evaluating.correlationId,
  });

  return evaluating;
}
