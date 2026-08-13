# ADR-008 — EventBridge custom bus (not the default bus)

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 6

## Context

`docs/architecture/03-aws.md` requires this choice ("custom event bus o default bus: justificar").

## Decision

A dedicated custom bus (`aws_cloudwatch_event_bus`), not the account default bus. Rule + targets
(audit/notification Lambdas) live in the `compute` module rather than `events`, to avoid a
dependency cycle (`events` would need Lambda ARNs from `compute`, which needs the bus name from
`events`) — see `infra/aws/modules/events/main.tf`.

## Consequences

- Keeps this PoC's events fully isolated from anything else in the same AWS account/region.
- `terraform destroy` removes exactly and only this project's event infrastructure — no ambiguity
  about what else might be listening on a shared default bus.
