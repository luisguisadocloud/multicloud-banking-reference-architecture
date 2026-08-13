# ADR-012 — FORCE_FAILURE must throw a technical failure, not resolve to REJECTED

**Status**: accepted
**Date**: 2026-08-12
**Related**: ADR-011, `specs/002-aws-reference-implementation/spec.md` User Story 2

## Context

`decide(requestedAmount, testFlag)` returned `"REJECTED"` when `testFlag === FORCE_FAILURE_FLAG` —
a successful, persisted business outcome. `evaluateApplication` saved the application, published
`ApplicationEvaluated`, and the worker Lambda ack'd the SQS message on the first attempt.

User Story 2 (spec.md) and `docs/10-running-and-testing.md`'s failure-engineering walkthrough both
require the opposite: the evaluation Lambda must fail repeatedly so SQS redelivers up to
`maxReceiveCount` and the message lands in the DLQ, so the CloudWatch alarm and the
correlationId-based log search have something real to observe. With `decide()` never throwing,
that flow could not occur — confirmed by reading `tests/unit/application/evaluateApplication.test.ts`
(asserted `result.status === "REJECTED"`, not a rejection) and by the fact that
`tests/e2e/forceFailureDeadLetter.e2e.test.ts` polls for a DLQ message that could never arrive.

## Decision

`FORCE_FAILURE` is no longer a `decide()` concern. `decide(requestedAmount)` dropped the
`testFlag` parameter and is now purely business logic (amount-based `APPROVED`/`MANUAL_REVIEW`).
`evaluateApplication` checks `application.customerReference === FORCE_FAILURE_FLAG` *before*
calling `decide()` and throws `SimulatedEvaluationFailureError` (new, `src/application/errors.ts`).
Nothing is persisted on that path, so the application stays `EVALUATING` and every SQS redelivery
re-reads the same record and throws identically, until `maxReceiveCount` routes it to the DLQ —
exactly the mechanism ADR-011 already committed to (fixture lives in `customerReference`, derived
internally by `evaluateApplication`), just with the correct failure mode at the end of it.

This also removes `REJECTED` as a reachable `decide()` outcome: in this fictitious M0 engine,
`REJECTED` was previously only ever produced by the fixture, never by a real business rule. It
remains a valid `ApplicationStatus`/`Decision` value for future milestones to wire up a real
rejection rule; none exists today.

## Consequences

- `workerEvaluateApplication.ts` needed no changes — its existing `catch` already pushes the
  `messageId` into `batchItemFailures` on any thrown error, which is what drives SQS redelivery.
- `tests/unit/domain/decisionEngine.test.ts` dropped the `FORCE_FAILURE` case (out of scope for a
  pure decision function now). `tests/unit/application/evaluateApplication.test.ts`'s FORCE_FAILURE
  case now asserts `SimulatedEvaluationFailureError` is thrown and that the application remains
  `EVALUATING` with no event published, instead of asserting `status === "REJECTED"`.
- `tests/e2e/forceFailureDeadLetter.e2e.test.ts` needed no changes — it already exercised the API
  contract, not the (buggy) internal mechanism.
