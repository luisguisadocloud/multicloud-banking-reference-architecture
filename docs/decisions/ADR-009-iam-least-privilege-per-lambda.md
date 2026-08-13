# ADR-009 — IAM least privilege: one scoped policy per Lambda

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 8, data-model.md's IAM table

## Context

FR-008 requires every Lambda to execute under a role granting only the permissions it needs —
directly enabled by ADR-005's one-function-per-responsibility split.

## Decision

Each of the 7 Lambda execution roles gets its own inline IAM policy naming exactly the
resources/actions that Lambda's adapter code calls (`infra/aws/modules/identity/main.tf`). No
shared "do everything" role.

## Consequences

- Corrected during implementation: presigning an S3 upload delegates real authorization to the
  signing role — `api-documents` needs `s3:PutObject` scoped to the bucket, which the original
  design draft under-specified as "no direct S3 IAM needed" (see corrected table in
  `specs/002-aws-reference-implementation/data-model.md`).
- `event-audit` and `event-notification` need no permissions beyond the shared
  `AWSLambdaBasicExecutionRole` attachment (CloudWatch Logs) — they only read the EventBridge
  payload and log it.
- A permission gap surfaces immediately as an `AccessDeniedException` in that Lambda's own
  CloudWatch Logs (see the Operational runbook appended to `docs/architecture/03-aws.md`), making
  IAM misconfiguration directly diagnosable rather than a silent failure.
