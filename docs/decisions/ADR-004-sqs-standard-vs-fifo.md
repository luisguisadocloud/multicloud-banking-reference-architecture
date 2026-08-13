# ADR-004 — SQS: Standard vs FIFO

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 2

## Context

`docs/architecture/03-aws.md` explicitly warns not to assume FIFO automatically.

## Decision

Standard queue for the evaluation queue.

## Consequences

- No cross-application ordering requirement exists, and idempotency is already handled at the
  application layer (M0's status-check guard, ADR-001), not via SQS deduplication.
- Avoids FIFO's throughput limits and message-group complexity for no corresponding requirement.
- Revisit only if a future requirement needs strict per-application message ordering.
