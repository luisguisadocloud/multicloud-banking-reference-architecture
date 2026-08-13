import type { ApplicationStatus } from "./CreditApplication";

const TERMINAL_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "APPROVED",
  "REJECTED",
  "MANUAL_REVIEW",
]);

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canMutate(status: ApplicationStatus): boolean {
  return status === "DRAFT";
}

export function canSubmit(status: ApplicationStatus): boolean {
  return status === "DRAFT";
}

export function canEvaluate(status: ApplicationStatus): boolean {
  return status === "EVALUATING";
}
