# Quickstart: M0 — Domain & Contract

Validation guide proving M0 works end-to-end with zero cloud credentials and zero cloud SDK
installed (spec Success Criterion SC-001). This is a run guide, not implementation code —
implementation lives in `tasks.md` and the code itself.

## Prerequisites

- Node.js ≥ 20, npm (already verified during repo bootstrap).
- No AWS/Azure/GCP account, credentials, or CLI required for anything in this guide.

## Setup

```bash
npm install
```

## Run the domain test suite (no cloud, no network)

```bash
npm test
```

Expected: all unit tests under `tests/unit/` pass — covering, at minimum:

- the full state machine (`DRAFT → SUBMITTED → EVALUATING → {APPROVED|REJECTED|MANUAL_REVIEW}`,
  SC-005),
- the deterministic decision engine (including the `FORCE_FAILURE` fixture),
- idempotent creation (same `Idempotency-Key` twice → one application, SC-003),
- idempotent submit (resubmitting a non-DRAFT application is a no-op),
- idempotent evaluation (redelivering the same work item twice → one recorded decision, SC-004).

## Run the contract test suite

```bash
npm test -- tests/contract
```

Expected: every endpoint in `openapi/credit-application-api.yaml` has at least one passing test
validating request/response shape against the schema (SC-002).

## Manually exercise the full lifecycle (illustrative, via the application layer directly)

Since M0 has no HTTP server or cloud deployment, "manual" exercise means driving the application
use cases directly against the in-memory port fakes — this is what the acceptance scenarios in
`spec.md` User Story 1 describe:

1. `createApplication({ customerReference: "CUSTOMER-001", requestedAmount: 5000 })` →
   expect `{ applicationId, status: "DRAFT" }`.
2. `authorizeDocumentUpload(applicationId, { type: "income-proof" })` →
   expect a `DocumentReference` linked to `applicationId`.
3. `submitApplication(applicationId)` →
   expect `status: "EVALUATING"` and one `EvaluateApplication` work item on the fake
   `EvaluationQueue`.
4. `evaluateApplication(theEnqueuedWorkItem)` →
   expect the application to reach a terminal status and one `ApplicationEvaluated` event on the
   fake `DomainEventPublisher`.
5. `getApplication(applicationId)` →
   expect the terminal status and decision to be visible.

## Verify the "no cloud SDK" boundary (SC-006)

```bash
grep -rEl "aws-sdk|@aws-sdk|@azure/|@google-cloud/" src/domain src/application
```

Expected: no matches (empty output, exit code 1). This is the check to wire into `npm run lint` or
CI once M1 introduces the first adapter with real cloud dependencies.

## Definition of Done reminder

Per `docs/09-milestones-and-dod.md`, M0 is done when: "Se puede ejecutar el dominio localmente sin
SDK cloud y explicar el flujo completo en términos de capabilities." Every step above is exactly
that check, made concrete and runnable.
