# domain

Cloud-agnostic domain model for the Digital Credit Application Processing Platform. No cloud SDK
imports allowed here (enforced by ESLint `no-restricted-imports`, see `.eslintrc.json`).

- `CreditApplication.ts` — the root aggregate: fields, `ApplicationStatus`, `Decision`.
- `DocumentReference.ts` — a document attached to an application.
- `EvaluateApplication.ts` — the async evaluation work item shape.
- `ApplicationEvent.ts` — the `ApplicationEvaluated` domain event shape.
- `applicationStateMachine.ts` — pure guard functions for valid state transitions.
- `decisionEngine.ts` — the deterministic, explicitly fictitious decision engine (`FORCE_FAILURE`
  test fixture included).

See `specs/001-domain-and-contract/data-model.md` for the full entity design and rationale.
