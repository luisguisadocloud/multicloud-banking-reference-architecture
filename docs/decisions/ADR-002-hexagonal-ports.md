# ADR-002 — Hexagonal ports design (no `UniversalCloudService`)

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/001-domain-and-contract/research.md` Decision 2, constitution Principle I,
`docs/architecture/02-logical-architecture.md`

## Context

`src/domain` and `src/application` must not depend on any AWS/Azure/GCP SDK (constitution
Principle I). The abstraction boundary between them and the cloud must be designed around what
the domain actually needs, not around hiding provider differences behind a generic interface —
the project's explicit anti-pattern to avoid is a `UniversalCloudDatabase`/`UniversalCloudService`
style interface.

## Decision

Four narrow ports, one per capability the application layer actually calls:

- `ApplicationRepository` — `save`, `findById`, `findByIdempotencyKey`.
- `DocumentStorage` — `authorizeUpload` (returns an opaque `objectKey`; no binary transfer).
- `EvaluationQueue` — `enqueue`.
- `DomainEventPublisher` — `publish`.

Idempotency-Key bookkeeping is folded into `ApplicationRepository.findByIdempotencyKey` rather
than modeled as a separate `IdempotencyKey` domain entity — it is fundamentally a storage concern
(a conditional write or a dedicated attribute in a real datastore), and the domain only needs to
ask "does this key already map to an application," not how that's persisted.

## Consequences

- Each port maps to exactly one M1/M2/M3 adapter family (DynamoDB/Cosmos/Firestore,
  S3/Blob/GCS, SQS/Service Bus/Pub-Sub, EventBridge/Event Grid/Eventarc) — the mapping from
  `docs/architecture/0{3,4,5}-*.md` to `src/adapters/{aws,azure,gcp}` is direct, one port per
  adapter file.
- No cross-cutting "cloud client" abstraction exists anywhere, so there is nothing to accidentally
  leak provider-specific semantics through.
- A dedicated `IdempotencyKey` entity was considered and rejected (see research.md Decision 2) —
  revisit only if a future milestone finds `findByIdempotencyKey` insufficient for a specific
  adapter's native idempotency mechanism (e.g. DynamoDB conditional writes), which would be
  handled inside that adapter, not by changing the port contract.
