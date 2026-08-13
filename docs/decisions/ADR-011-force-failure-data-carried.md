# ADR-011 — FORCE_FAILURE must be data-carried, not a function parameter

**Status**: accepted (the `decide()` detail in "Decision" below was corrected by ADR-012 — the
where-the-flag-lives decision here still stands)
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 10

## Context

M0's `evaluateApplication(message, deps, testFlag?)` accepted the `FORCE_FAILURE` fixture as a
third function argument — workable for direct in-process unit tests, but an SQS-triggered Lambda
worker in a real deployment has no channel to receive an out-of-band function parameter; it only
ever sees the SQS message body and whatever it reads back from DynamoDB.

## Decision

`evaluateApplication` no longer takes `testFlag`. It derives the flag internally:
`application.customerReference === FORCE_FAILURE_FLAG`. `decide()` itself is unchanged (still a
pure function taking an explicit `testFlag`) — only how `evaluateApplication` invokes it changed.
This matches what `docs/01-business-case.md` already described ("puede existir un campo... como
FORCE_FAILURE").

## Consequences

- The AWS E2E failure-engineering test (`tests/e2e/forceFailureDeadLetter.e2e.test.ts`) can force
  a real failure simply by setting `customerReference` on the create request — no special test
  hook needed anywhere in the deployed system.
- M0's `tests/unit/application/evaluateApplication.test.ts` updated accordingly (the FORCE_FAILURE
  scenario now creates an application with that `customerReference` instead of passing a third
  argument).
- No new field added to `CreditApplication` or `EvaluateApplication` — `customerReference` already
  served this role per the source spec's own suggestion; adding a dedicated field would have put a
  permanent, always-present slot on production-shaped domain data purely to carry test-fixture
  data.
