# ADR-005 — Lambda granularity: one function per responsibility

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 3, ADR-009

## Context

`docs/architecture/03-aws.md` already names this shape ("Funciones para: create-application,
submit-application, get-application, evaluate-application, audit-event").

## Decision

7 separate Lambda functions (`api-create`, `api-documents`, `api-submit`, `api-get`,
`worker-evaluate`, `event-audit`, `event-notification`) rather than one monolithic handler with
internal routing.

## Consequences

- Each Lambda gets its own IAM role scoped to exactly what it touches (FR-008, ADR-009) — a
  monolithic handler would need the union of every permission, violating least privilege by
  construction.
- 7 separate esbuild bundles / zip artifacts (`scripts/build-lambda.mjs`,
  `infra/aws/modules/compute/`) instead of 1 — a deliberate, small operational cost for the
  security/clarity benefit.
