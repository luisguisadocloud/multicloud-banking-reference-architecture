import type { Decision } from "./CreditApplication";

// Test-only fixture value (never real customer/request data) carried in `customerReference` to
// simulate a technical evaluation failure (SQS redelivery → DLQ), used by failure-engineering
// scenarios in M1. Detected upstream in evaluateApplication before decide() runs — see
// docs/01-business-case.md.
export const FORCE_FAILURE_FLAG = "FORCE_FAILURE" as const;

const MANUAL_REVIEW_MIN_AMOUNT = 50_000;

/**
 * Explicitly fictitious, deterministic decision engine (FR-008). Never presents itself as a real
 * credit risk model.
 */
export function decide(requestedAmount: number): Decision {
  if (requestedAmount >= MANUAL_REVIEW_MIN_AMOUNT) {
    return "MANUAL_REVIEW";
  }
  return "APPROVED";
}

export function computeFictitiousRiskScore(requestedAmount: number): number {
  return Math.min(100, Math.round(requestedAmount / 1000));
}
