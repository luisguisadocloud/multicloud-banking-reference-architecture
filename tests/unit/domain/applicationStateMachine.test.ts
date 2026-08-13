import {
  canEvaluate,
  canMutate,
  canSubmit,
  isTerminalStatus,
} from "../../../src/domain/applicationStateMachine";
import type { ApplicationStatus } from "../../../src/domain/CreditApplication";

const ALL_STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "EVALUATING",
  "APPROVED",
  "REJECTED",
  "MANUAL_REVIEW",
];

describe("applicationStateMachine", () => {
  it.each(ALL_STATUSES)("classifies %s consistently across all guards", (status) => {
    expect(canMutate(status)).toBe(status === "DRAFT");
    expect(canSubmit(status)).toBe(status === "DRAFT");
    expect(canEvaluate(status)).toBe(status === "EVALUATING");
    expect(isTerminalStatus(status)).toBe(
      status === "APPROVED" || status === "REJECTED" || status === "MANUAL_REVIEW",
    );
  });

  it("covers every business status defined in the domain (SC-005)", () => {
    expect(ALL_STATUSES).toHaveLength(6);
  });
});
