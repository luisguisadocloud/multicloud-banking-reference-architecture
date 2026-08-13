# Architecture Decision Records

Cada decisión técnica no trivial (elección de partition key strategy, FIFO vs Standard queue, tier
de un servicio managed, patrón de idempotency elegido, etc.) se documenta aquí como un ADR
numerado: `ADR-001-<slug>.md`, `ADR-002-<slug>.md`, ...

## Formato

```markdown
# ADR-00N — <título>

**Status**: proposed | accepted | superseded by ADR-00X
**Date**: YYYY-MM-DD
**Context**: qué problema o disyuntiva obliga a decidir.
**Decision**: qué se decidió.
**Consequences**: qué implica (positivo y negativo), qué queda abierto.
```

## Estado actual

### M0 — Domain & Contract

- [ADR-001](ADR-001-consumer-idempotency-pattern.md) — patrón de idempotency del evaluation worker (status check).
- [ADR-002](ADR-002-hexagonal-ports.md) — diseño de los 4 ports hexagonales, sin `UniversalCloudService`.

### M1 — AWS Reference Implementation

- [ADR-003](ADR-003-api-gateway-http-vs-rest.md) — API Gateway HTTP API vs REST API.
- [ADR-004](ADR-004-sqs-standard-vs-fifo.md) — SQS Standard vs FIFO.
- [ADR-005](ADR-005-lambda-granularity.md) — una Lambda por responsabilidad.
- [ADR-006](ADR-006-dynamodb-key-design.md) — diseño de claves DynamoDB + GSI de idempotency.
- [ADR-007](ADR-007-conditional-writes.md) — conditional writes para idempotency/concurrencia.
- [ADR-008](ADR-008-eventbridge-custom-bus.md) — bus custom de EventBridge.
- [ADR-009](ADR-009-iam-least-privilege-per-lambda.md) — IAM least privilege por Lambda.
- [ADR-010](ADR-010-document-storage-upload-url.md) — corrección: `DocumentStorage` port sin upload URL.
- [ADR-011](ADR-011-force-failure-data-carried.md) — corrección: `FORCE_FAILURE` debe viajar en los datos, no como parámetro de función.
- [ADR-012](ADR-012-force-failure-throws-not-rejects.md) — corrección: `FORCE_FAILURE` debe lanzar un fallo técnico (retry SQS → DLQ), no resolver a `REJECTED`.

Los siguientes ADRs surgirán de cada milestone de implementación por nube (M2–M3) según se tomen
decisiones concretas de partitioning, consistency, etc. (ver `docs/architecture/04-azure.md`,
`05-gcp.md`).
