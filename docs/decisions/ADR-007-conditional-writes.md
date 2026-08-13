# ADR-007 — Conditional writes for idempotency and concurrency

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 5,
`src/adapters/aws/DynamoDbApplicationRepository.ts`

## Context

M0's ADR-001 (status-check idempotency pattern) left an open risk: two redeliveries processed
concurrently before either write lands could both pass the in-memory/application-level check.

## Decision

`save` on creation (`application.version === 0`) uses
`ConditionExpression: attribute_not_exists(applicationId)`. `save` on every subsequent transition
uses `ConditionExpression: version = :expectedVersion` (optimistic concurrency).

## Consequences

- Closes the race window M0's research.md flagged as an open, adapter-level concern.
- `DynamoDbApplicationRepository.save` distinguishes creation from transition purely by
  `version === 0` — callers never pass an explicit "is this a creation" flag; the version already
  set by the application layer (`src/application/createApplication.ts` sets `version: 0`) is
  sufficient.
- A conditional-write failure surfaces as a DynamoDB `ConditionalCheckFailedException`, which
  `src/adapters/aws/logger.ts` captures with `errorType`/`errorMessage` like any other error.
