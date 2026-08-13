# ADR-006 — DynamoDB key design and idempotency-key lookup

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 4, data-model.md

## Context

M0's `ApplicationRepository` port defines three access patterns: `findById`,
`findByIdempotencyKey`, `save`. AWS needs a concrete DynamoDB schema satisfying all three without
scans.

## Decision

Single table, partition key `applicationId`. GSI `idempotencyKey-index` (partition key
`idempotencyKey`, `ProjectionType: ALL`) backs `findByIdempotencyKey`. `documentReferences` stored
as an embedded list attribute — no separate table, mirroring M0's in-memory shape exactly.

## Consequences

- `findById` → `GetItem`; `findByIdempotencyKey` → `Query` on the GSI; `save` → `PutItem`. No
  access pattern needs a scan.
- A dedicated idempotency-key table/shadow-item was rejected as unnecessary — a GSI is the
  idiomatic DynamoDB way to support a second lookup key without a second write path to keep
  consistent.
