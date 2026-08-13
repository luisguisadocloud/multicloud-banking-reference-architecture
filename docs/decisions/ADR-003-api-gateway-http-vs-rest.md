# ADR-003 — API Gateway: HTTP API vs REST API

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 1

## Context

`docs/architecture/03-aws.md` requires this choice to be made consciously and documented, not
defaulted to.

## Decision

HTTP API (`aws_apigatewayv2_api`, `protocol_type = "HTTP"`).

## Consequences

- Simpler, cheaper Terraform surface — no request/response transformation templates, resource
  policies, or usage plans needed for this contract.
- If a future milestone needs WAF attached directly to API Gateway (V2 scope) or fine-grained
  request validation beyond what the Lambda handlers do, REST API would need to be reconsidered
  then — not before.
