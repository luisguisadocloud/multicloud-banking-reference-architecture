# ADR-001 — Consumer idempotency pattern for the evaluation worker

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/001-domain-and-contract/research.md` Decision 1, FR-007, SC-004

## Context

`docs/architecture/02-logical-architecture.md` requires the evaluation worker to tolerate
redelivery of the same `EvaluateApplication` message without duplicate effects, and explicitly
asks the implementation to document which of three suggested patterns was chosen and why:
status/version check, processed-message record, or conditional update.

## Decision

Status check: `evaluateApplication` reads the application's current `status` before acting; if it
is already a terminal status (`APPROVED`, `REJECTED`, `MANUAL_REVIEW`), the use case is a no-op —
it returns the existing application unchanged and does not re-publish `ApplicationEvaluated`.

## Consequences

- No additional entity or storage is needed beyond `CreditApplication` itself — the in-memory M0
  domain model stays minimal.
- The guard is directly testable through `ApplicationRepository` alone (see
  `tests/unit/application/evaluateApplication.idempotency.test.ts`).
- Not robust against two redeliveries processed concurrently before either write lands (a true
  race). This is acceptable for M0's in-memory, single-threaded test execution. If a real
  at-least-once broker in M1/M2/M3 exposes this race in practice, the fix is an adapter-level
  concern (e.g. a conditional write keyed on version/status) documented per cloud in
  `docs/comparisons/08-aws-vs-azure-vs-gcp.md` — not a reason to add a processed-message-record
  entity to the M0 domain model.
