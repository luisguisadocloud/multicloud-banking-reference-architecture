# application

Use cases orchestrating the domain via the ports in `src/ports`. No cloud SDK imports allowed here
(enforced by ESLint `no-restricted-imports`).

- `createApplication.ts` — create a DRAFT application, idempotent on `Idempotency-Key`.
- `authorizeDocumentUpload.ts` — request upload authorization for a document on a DRAFT application.
- `submitApplication.ts` — DRAFT → SUBMITTED → EVALUATING, enqueues `EvaluateApplication`; idempotent no-op if already past DRAFT.
- `evaluateApplication.ts` — runs the decision engine, transitions to a terminal status, publishes `ApplicationEvaluated`; idempotent no-op if already terminal (redelivery-safe).
- `getApplication.ts` — read current status/decision.
- `errors.ts` — `InvalidApplicationRequestError`, `ApplicationNotFoundError`, `InvalidStateTransitionError`.

See `specs/001-domain-and-contract/research.md` for the idempotency pattern rationale.
