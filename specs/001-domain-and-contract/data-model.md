# Phase 1 Data Model: M0 — Domain & Contract

Derived from `spec.md` Key Entities and `docs/01-business-case.md`. All fields are cloud-agnostic —
no field here implies a specific datastore's native types.

## CreditApplication

The credit request and its lifecycle state. Root aggregate of this bounded context.

| Field                | Type                | Notes                                                                                            |
| -------------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `applicationId`      | string              | Assigned on creation. Format decided during implementation (e.g. `APP-` + ULID); must be unique. |
| `customerReference`  | string              | Synthetic identifier, e.g. `CUSTOMER-001`. Never real PII (constitution).                        |
| `requestedAmount`    | number              | Drives the deterministic decision engine (Research Decision 3). Must be > 0.                     |
| `status`             | enum                | `DRAFT \| SUBMITTED \| EVALUATING \| APPROVED \| REJECTED \| MANUAL_REVIEW`                      |
| `documentReferences` | DocumentReference[] | Zero or more; populated via the upload-authorization use case.                                   |
| `riskScore`          | number \| null      | Optional, set only after evaluation. Fictitious (FR-008).                                        |
| `decision`           | enum \| null        | Mirrors terminal `status` once evaluated, or null before.                                        |
| `idempotencyKey`     | string \| null      | The `Idempotency-Key` used at creation, if any (Research Decision 2).                            |
| `correlationId`      | string              | Propagated from creation through evaluation (FR-010).                                            |
| `createdAt`          | ISO 8601 string     |                                                                                                  |
| `updatedAt`          | ISO 8601 string     |                                                                                                  |
| `version`            | number              | Optional optimistic-concurrency counter; incremented on every state transition.                  |

### State transitions (state machine)

```
DRAFT ──submit──> SUBMITTED ──(enqueue)──> EVALUATING ──evaluate──┬─> APPROVED
                                                                    ├─> REJECTED
                                                                    └─> MANUAL_REVIEW
```

**Validation rules** (FR-004):

- Only a `DRAFT` application may be mutated (fields edited) or have documents attached.
- `submit` is only valid from `DRAFT`; from any other status it is a no-op (Research Decision 1 /
  User Story 2, Acceptance Scenario 2) — it MUST NOT throw, to keep client retries simple, but MUST
  NOT enqueue a second `EvaluateApplication` work item either.
- `evaluate` is only meaningful from `EVALUATING`; if the application is already terminal, it is a
  no-op (Research Decision 1).
- Terminal statuses (`APPROVED`, `REJECTED`, `MANUAL_REVIEW`) are final — no further transition is
  defined for M0.

## DocumentReference

A document associated with an application, created via the upload-authorization use case.

| Field           | Type                    | Notes                                                                                                                                                                       |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documentId`    | string                  | Unique per document.                                                                                                                                                        |
| `applicationId` | string                  | FK to `CreditApplication.applicationId`.                                                                                                                                    |
| `type`          | string                  | e.g. `income-proof`, `identity-document` — free-form in M0, no enum enforced yet.                                                                                           |
| `objectKey`     | string                  | The key/path a real object-storage adapter would use later (M1+); in M0 this is just an opaque string the domain generates deterministically, not a real storage reference. |
| `uploadedAt`    | ISO 8601 string \| null | Null until (future, post-M0) confirmation of actual upload; M0 only models the authorization step, not upload confirmation (spec Assumptions).                              |

**Validation rules** (User Story 3):

- Requesting authorization for a non-existent `applicationId` MUST be rejected without creating a
  `DocumentReference` (Acceptance Scenario 2).
- Requesting authorization for an application not in `DRAFT` MUST be rejected (FR-004 — only
  `DRAFT` applications are mutable, and attaching a document is a mutation).

## EvaluateApplication (work item / command)

Not persisted as domain state — it is the message shape produced by `submit` and consumed by
`evaluate`, carried through the `EvaluationQueue` port.

| Field           | Type   | Notes                                                  |
| --------------- | ------ | ------------------------------------------------------ |
| `messageId`     | string | Unique per enqueued work item.                         |
| `applicationId` | string | FK to `CreditApplication.applicationId`.               |
| `correlationId` | string | Propagated from the originating HTTP request (FR-010). |

## ApplicationEvent — `ApplicationEvaluated`

The domain event published once an application reaches a terminal status, carried through the
`DomainEventPublisher` port.

| Field           | Type            | Notes                                                                                |
| --------------- | --------------- | ------------------------------------------------------------------------------------ |
| `eventId`       | string          | Unique per event.                                                                    |
| `eventType`     | string          | Fixed value `"ApplicationEvaluated"` for M0 (only domain event defined).             |
| `applicationId` | string          | FK to `CreditApplication.applicationId`.                                             |
| `correlationId` | string          | Propagated (FR-010).                                                                 |
| `result`        | enum            | `APPROVED \| REJECTED \| MANUAL_REVIEW` — mirrors the application's terminal status. |
| `timestamp`     | ISO 8601 string |                                                                                      |

## Relationships

```
CreditApplication 1 ──── * DocumentReference
CreditApplication 1 ──── 0..1 EvaluateApplication (in flight, transient — not stored state)
CreditApplication 1 ──── 0..1 ApplicationEvaluated (emitted once, on terminal transition)
```

## Out of scope for this data model (explicitly, per spec Assumptions)

- Any field or table implying a specific cloud datastore (partition keys, RUs, document IDs
  specific to DynamoDB/Cosmos/Firestore) — that is M1/M2/M3 adapter-level design, documented per
  cloud in `docs/architecture/03-aws.md` / `04-azure.md` / `05-gcp.md`.
- Upload confirmation / actual binary storage — only authorization is modeled here.
