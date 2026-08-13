# Phase 0 Research: M0 — Domain & Contract

No `[NEEDS CLARIFICATION]` markers were left in `plan.md`'s Technical Context — language, testing,
and platform were already fixed during repo bootstrap. This document instead resolves the concrete
design decisions M0 must make that the source specification intentionally left open (per
`docs/architecture/02-logical-architecture.md`: "la implementación debe documentar qué patrón se
eligió y por qué").

## Decision 1: Consumer idempotency pattern for the evaluation worker

**Decision**: Status/version check — before applying a decision, the evaluation use case reads
the current `CreditApplication.status`; if it is already a terminal status (`APPROVED`,
`REJECTED`, `MANUAL_REVIEW`), the use case is a no-op and does not re-publish
`ApplicationEvaluated`.

**Rationale**: Of the three patterns suggested in `docs/architecture/02-logical-architecture.md`
(status/version check, processed-message record, conditional update), status/version check needs
no additional entity or storage beyond `CreditApplication` itself, which keeps M0's in-memory
domain model minimal. It composes naturally with FR-007/FR-008 (exactly one terminal status) and
is directly testable without any port beyond `ApplicationRepository`.

**Alternatives considered**:

- _Processed-message record_ (store every seen `messageId`): more robust against
  out-of-order/concurrent redelivery, but requires a new entity/port purely for deduplication
  bookkeeping that M0 does not otherwise need. Revisit in M1+ if a real broker's at-least-once
  semantics expose a race the status check alone can't catch (e.g. two redeliveries processed
  concurrently before either write lands) — that is an adapter-level concern to document per cloud
  (`docs/comparisons/08-aws-vs-azure-vs-gcp.md`), not a reason to complicate the M0 domain model.
- _Conditional update_ (e.g. `UPDATE ... WHERE status = 'EVALUATING'`): this is a storage-layer
  concurrency primitive, not something the cloud-agnostic domain can express — it belongs in each
  `ApplicationRepository` adapter (M1/M2/M3), not in M0.

## Decision 2: `POST /applications` idempotency-key bookkeeping

**Decision**: Modeled as a concern of the `ApplicationRepository` port's `save`/`findBy` contract,
not as a separate domain entity. The use case asks the repository "does an application already
exist for this `Idempotency-Key`?" before creating one; the in-memory fake for M0 keeps a simple
key→applicationId map to answer that.

**Rationale**: `Idempotency-Key` bookkeeping is fundamentally a storage concern (in production this
is a conditional write or a dedicated idempotency table/attribute) and per
`docs/architecture/02-logical-architecture.md` the abstraction must be designed "sobre necesidades
del sistema" — the domain only needs to ask "does this key already map to an application," it does
not need to know how that's persisted.

**Alternatives considered**: A dedicated `IdempotencyKey` domain entity was considered and
rejected — it would leak a storage/HTTP-layer concern into the domain model for no behavioral
benefit at this stage, violating the "no `UniversalCloudService`-style over-abstraction" guidance
in the constitution.

## Decision 3: Deterministic decision engine shape

**Decision**: A pure function `decide(requestedAmount: number, testFlag?: "FORCE_FAILURE"):
{ result: "APPROVED" | "REJECTED" | "MANUAL_REVIEW" }` with fixed, documented thresholds (e.g.
below a low threshold → `APPROVED`, above a high threshold → `MANUAL_REVIEW`, everything else →
`APPROVED`; `FORCE_FAILURE` short-circuits to `REJECTED`/throws for failure-engineering tests).
Exact threshold values are an implementation detail to fix during coding, not a spec-level
decision — the spec only requires determinism and explicit fictitiousness (FR-008).

**Rationale**: A pure function with no side effects is trivially unit-testable and keeps the
"explicitly fictitious, never presented as a real credit model" requirement easy to satisfy — there
is no learned/external model to accidentally imply.

**Alternatives considered**: A rule-engine/config-driven approach was considered and rejected as
over-engineering for a fixture whose only job is to be deterministic and demonstrably fake.

## Decision 4: `tests/unit/` as a new subdirectory

**Decision**: Add `tests/unit/` (not present in the original `docs/architecture/02-logical-architecture.md`
tree, which only lists `contract/integration/e2e`) to hold domain and application unit tests,
separate from `tests/contract/` (OpenAPI shape validation).

**Rationale**: Domain/application unit tests (state transitions, decision engine, idempotency
logic) are a different concern from contract tests (does a response match the OpenAPI schema).
Conflating them in one directory would make the test suite harder to navigate as the project grows
through M1–M3. Documented explicitly here and in `plan.md` so it is a visible, intentional addition
rather than silent scope drift (per constitution governance rules).

**Alternatives considered**: Putting unit tests inside `src/` next to the code they test
(`src/domain/*.test.ts`) — a common TypeScript convention. Rejected only to stay literally aligned
with the repo's already-committed `tests/` top-level convention from the bootstrap commit; either
approach is reasonable and this is recorded as a low-stakes convention choice, not a hard
constraint for later milestones.

## Output

All Technical Context fields in `plan.md` were already resolved (no NEEDS CLARIFICATION remained).
The four decisions above are the design-level unknowns Phase 1 (data-model.md, contracts,
quickstart.md) builds on.
