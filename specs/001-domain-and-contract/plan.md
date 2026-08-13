# Implementation Plan: M0 — Domain & Contract

**Branch**: `001-domain-and-contract` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-domain-and-contract/spec.md`

## Summary

Build the cloud-agnostic domain model, application use cases, hexagonal ports, and the
OpenAPI contract for the Digital Credit Application Processing Platform, fully exercisable
locally (no cloud SDK, no network) through in-memory test doubles of the ports. This is the
foundation every subsequent milestone (AWS, Azure, GCP) ports against — nothing here may depend
on a specific cloud provider.

## Technical Context

**Language/Version**: TypeScript 5.7 on Node.js ≥ 20 (already fixed in `package.json`/`tsconfig.json` during repo bootstrap — see ADR to be recorded once implementation starts).

**Primary Dependencies**: None at runtime for `src/domain` and `src/application` — the domain must
compile and run with zero external packages beyond the TypeScript standard library. Dev-only:
Jest 29 + ts-jest, ESLint, Prettier (already scaffolded).

**Storage**: N/A for M0. `ApplicationRepository` is exercised exclusively through an in-memory
fake in tests; a real datastore adapter (DynamoDB/Cosmos DB/Firestore) is out of scope until
M1/M2/M3.

**Testing**: Jest (`jest.config.ts`, already scaffolded) — unit tests for domain/application,
contract tests for the OpenAPI shape (`tests/contract/`).

**Target Platform**: Node.js ≥ 20, runnable fully offline with no cloud credentials.

**Project Type**: Single project (this feature only touches `src/domain`, `src/application`,
`src/ports`, `openapi/`, `tests/contract`, `tests/unit` within the already-established repo
skeleton — no web/mobile split applies here).

**Performance Goals**: N/A — no deployed infrastructure exists yet to have SLAs against. The only
requirement is that the local test suite runs fast enough for a tight development loop (seconds,
not minutes).

**Constraints**: Zero imports of any AWS/Azure/GCP SDK in `src/domain` or `src/application`
(constitution Principle I; FR-013). Fully runnable offline (FR-014).

**Scale/Scope**: One bounded context (Digital Credit Application). 4 entities
(`CreditApplication`, `DocumentReference`, `EvaluateApplication`, `ApplicationEvent`), 5 use cases
(create, request-upload-authorization, submit, evaluate, get), 4 mandatory OpenAPI endpoints
(+1 optional, `GET /applications/{id}/events`, deferred per spec Assumptions).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                             | Status                   | Notes                                                                                                                                                                                 |
| ----------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Cloud-Agnostic Domain, Cloud-Native Infrastructure | **PASS**                 | M0 is precisely where this boundary is established and made verifiable (FR-013, SC-006: zero cloud SDK imports in `src/domain`/`src/application`, enforced by lint/dependency check). |
| II. Compare Capabilities, Not Memorize Names          | N/A                      | No cross-cloud comparison happens in M0 — that begins in M1–M3. Not violated.                                                                                                         |
| III. Portable Does Not Mean Cross-Cloud Runtime       | N/A                      | No cloud runtime exists yet in M0. Not violated.                                                                                                                                      |
| IV. Reproducibility First                             | **PASS**                 | M0 needs no Terraform (no cloud resources), but is fully reproducible via `npm install && npm test` — no manual/unrepeatable setup.                                                   |
| V. Operating Is Also Learning                         | N/A (partial groundwork) | Full console/failure-scenario operation starts at M1+, but `correlationId` propagation (FR-010) is modeled here so downstream milestones inherit it rather than retrofitting it.      |
| Scope Boundaries (V1/V1.1/V2/out-of-scope)            | **PASS**                 | M0 touches only items explicitly listed as V1-mandatory (`docs/00-vision-and-scope.md`); no V1.1/V2/out-of-scope capability is introduced.                                            |

No violations. Complexity Tracking table intentionally left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-domain-and-contract/
├── spec.md               # Feature specification (/speckit-specify output)
├── plan.md                # This file (/speckit-plan output)
├── research.md            # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/
│   └── README.md          # Points to the canonical openapi/credit-application-api.yaml
├── checklists/
│   └── requirements.md    # Spec quality checklist (/speckit-specify output)
└── tasks.md                # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

This feature operates entirely inside the repo skeleton already fixed by
`docs/architecture/02-logical-architecture.md` and the project constitution — no new top-level
structure is introduced. M0 populates only the cloud-agnostic slice of it:

```text
openapi/
└── credit-application-api.yaml   # canonical OpenAPI contract — produced in Phase 1 below

src/
├── domain/          # CreditApplication, DocumentReference, ApplicationEvent, state machine,
│                     # deterministic decision engine — POPULATED in M0
├── application/      # use cases: create, request-upload-authorization, submit, evaluate, get
│                     # — POPULATED in M0
├── ports/             # ApplicationRepository, DocumentStorage, EvaluationQueue,
│                     # DomainEventPublisher — POPULATED in M0
└── adapters/          # aws/, azure/, gcp/ — left untouched, populated M1/M2/M3

tests/
├── contract/          # OpenAPI request/response shape tests — POPULATED in M0
├── unit/               # domain + application unit tests — POPULATED in M0 (new dir under tests/)
├── integration/        # left untouched, populated starting M1
└── e2e/                 # left untouched, populated starting M1
```

**Structure Decision**: Single project, Option 1 (no frontend/backend/mobile split — this is a
domain + contract library consumed later by per-cloud adapters). `tests/unit/` is a new
subdirectory not present in the original repo skeleton diagram (which only listed
`contract/integration/e2e`); it is added here because domain/application unit tests need a home
distinct from OpenAPI contract tests, and reusing `tests/contract/` for both would blur that
distinction. This is a minor, justified extension of the documented structure, not a scope change.

## Complexity Tracking

_No Constitution Check violations — table intentionally empty._
