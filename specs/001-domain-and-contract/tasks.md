# Tasks: M0 — Domain & Contract

**Input**: Design documents from `/specs/001-domain-and-contract/` (spec.md, plan.md, research.md,
data-model.md, contracts/, quickstart.md)

**Tests**: Explicitly required by the feature spec — `docs/09-milestones-and-dod.md` M0
entregables list "Unit tests principales" and "Fixtures sintéticos", and `spec.md` Success
Criteria SC-002 through SC-006 are only verifiable through automated tests. Test tasks are
therefore included below.

**Organization**: Tasks are grouped by user story from `spec.md` (US1, US2, US3) to enable
independent implementation and testing, per constitution-aligned incremental delivery.

## Phase 1: Setup

- [x] T001 Run `npm install` at repo root to materialize the TypeScript/Jest/ESLint toolchain already declared in `package.json`
- [x] T002 [P] Create `tests/unit/` directory (new subdirectory decided in `research.md` Decision 4, not present in the original repo skeleton)

**Checkpoint**: `npm test` runs (with zero test files) without configuration errors.

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Domain types, ports, decision engine and in-memory test doubles shared by every user
story. No user story can be implemented before this phase completes.

- [x] T003 [P] Define `CreditApplication` entity (fields + `ApplicationStatus` enum) per `data-model.md` in `src/domain/CreditApplication.ts`
- [x] T004 [P] Define `DocumentReference` entity per `data-model.md` in `src/domain/DocumentReference.ts`
- [x] T005 [P] Define `EvaluateApplication` work item type per `data-model.md` in `src/domain/EvaluateApplication.ts`
- [x] T006 [P] Define `ApplicationEvent` (`ApplicationEvaluated`) type per `data-model.md` in `src/domain/ApplicationEvent.ts`
- [x] T007 Implement the state transition guard (valid/invalid transitions per `data-model.md` state machine) in `src/domain/applicationStateMachine.ts`
- [x] T008 [P] Implement the deterministic decision engine `decide()` per `research.md` Decision 3 in `src/domain/decisionEngine.ts`
- [x] T009 [P] Define `ApplicationRepository` port interface in `src/ports/ApplicationRepository.ts`
- [x] T010 [P] Define `DocumentStorage` port interface in `src/ports/DocumentStorage.ts`
- [x] T011 [P] Define `EvaluationQueue` port interface in `src/ports/EvaluationQueue.ts`
- [x] T012 [P] Define `DomainEventPublisher` port interface in `src/ports/DomainEventPublisher.ts`
- [x] T013 [P] Implement in-memory `InMemoryApplicationRepository` test double, including Idempotency-Key lookup per `research.md` Decision 2, in `tests/unit/fakes/InMemoryApplicationRepository.ts`
- [x] T014 [P] Implement in-memory test doubles for `DocumentStorage`, `EvaluationQueue`, `DomainEventPublisher` in `tests/unit/fakes/`
- [x] T015 [P] Unit tests for the state machine covering all 6 statuses and rejecting invalid transitions (SC-005) in `tests/unit/domain/applicationStateMachine.test.ts`
- [x] T016 [P] Unit tests for the decision engine (approve / manual-review ranges + `FORCE_FAILURE` fixture) in `tests/unit/domain/decisionEngine.test.ts`

**Checkpoint**: Domain types, ports, decision engine and fakes exist and are unit-tested in
isolation. User story implementation can now begin.

## Phase 3: User Story 1 - Create, submit and track a credit application (Priority: P1) 🎯 MVP

**Goal**: An applicant can create an application, submit it, have it evaluated, and query its
final status — end to end, locally, no cloud.

**Independent Test**: Run `npm test` after this phase; the full lifecycle described in
`quickstart.md` passes using only the in-memory fakes from Phase 2.

- [x] T017 [US1] Implement `createApplication` use case in `src/application/createApplication.ts`
- [x] T018 [US1] Implement `submitApplication` use case in `src/application/submitApplication.ts`
- [x] T019 [US1] Implement `evaluateApplication` use case in `src/application/evaluateApplication.ts`
- [x] T020 [US1] Implement `getApplication` use case in `src/application/getApplication.ts`
- [x] T021 [P] [US1] Unit tests for `createApplication` happy path in `tests/unit/application/createApplication.test.ts`
- [x] T022 [P] [US1] Unit tests for `submitApplication` happy path in `tests/unit/application/submitApplication.test.ts`
- [x] T023 [P] [US1] Unit tests for `evaluateApplication` happy path — approve/reject/manual-review — in `tests/unit/application/evaluateApplication.test.ts`
- [x] T024 [P] [US1] Unit tests for `getApplication` in `tests/unit/application/getApplication.test.ts`
- [x] T025 [P] [US1] Contract test for `POST /applications` against `openapi/credit-application-api.yaml` in `tests/contract/createApplication.contract.test.ts`
- [x] T026 [P] [US1] Contract test for `POST /applications/{applicationId}/submit` in `tests/contract/submitApplication.contract.test.ts`
- [x] T027 [P] [US1] Contract test for `GET /applications/{applicationId}` in `tests/contract/getApplication.contract.test.ts`
- [x] T041 [P] [US1] Test: invalid payload (e.g. missing `customerReference`/`requestedAmount`) is rejected with no state mutation (FR-011) in `tests/unit/application/createApplication.validation.test.ts` — _added during `/speckit-analyze` consistency check, see Analysis Report below_
- [x] T042 [P] [US1] Test: `correlationId` propagates end-to-end from create → submit → evaluate → `ApplicationEvaluated` event (FR-010) in `tests/unit/application/correlationId.test.ts` — _added during `/speckit-analyze` consistency check, see Analysis Report below_

**Checkpoint**: User Story 1 is independently functional and testable — this alone is a viable MVP.

## Phase 4: User Story 2 - Idempotent request and message handling (Priority: P2)

**Goal**: Duplicate create requests, duplicate submits, and redelivered evaluation messages never
produce duplicate effects.

**Independent Test**: Run the idempotency-specific tests in isolation; each asserts "do it twice,
observe it happened once."

- [x] T028 [US2] Add Idempotency-Key duplicate-detection to `createApplication` (extends `src/application/createApplication.ts` from T017)
- [x] T029 [US2] Add no-op resubmit guard to `submitApplication` (extends `src/application/submitApplication.ts` from T018)
- [x] T030 [US2] Add terminal-status no-op guard to `evaluateApplication` per `research.md` Decision 1 (extends `src/application/evaluateApplication.ts` from T019)
- [x] T031 [P] [US2] Idempotency test: duplicate create with same `Idempotency-Key` yields one application (SC-003) in `tests/unit/application/createApplication.idempotency.test.ts`
- [x] T032 [P] [US2] Idempotency test: duplicate submit is a no-op in `tests/unit/application/submitApplication.idempotency.test.ts`
- [x] T033 [P] [US2] Idempotency test: redelivered evaluation work item is a no-op (SC-004) in `tests/unit/application/evaluateApplication.idempotency.test.ts`

**Checkpoint**: User Story 1 + User Story 2 together are demonstrably safe under retries and
redelivery.

## Phase 5: User Story 3 - Authorize a document upload (Priority: P3)

**Goal**: An applicant can request upload authorization for a document attached to a `DRAFT`
application.

**Independent Test**: Request authorization against an existing `DRAFT` application and against a
non-existent one; assert the respective success/rejection independently of US1/US2.

- [x] T034 [US3] Implement `authorizeDocumentUpload` use case in `src/application/authorizeDocumentUpload.ts`
- [x] T035 [P] [US3] Unit tests: happy path, non-existent application, non-DRAFT application in `tests/unit/application/authorizeDocumentUpload.test.ts`
- [x] T036 [P] [US3] Contract test for `POST /applications/{applicationId}/documents` in `tests/contract/authorizeDocumentUpload.contract.test.ts`

**Checkpoint**: All three user stories are independently implemented and tested.

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T037 [P] Add a "no cloud SDK imports in `src/domain`/`src/application`" check (ESLint `no-restricted-imports` or equivalent) to `.eslintrc.json`, enforcing FR-013/SC-006
- [x] T038 Run `npm run lint` and `npm test` end-to-end and fix any violations
- [x] T039 [P] Replace the bootstrap placeholder text in `src/domain/README.md`, `src/application/README.md`, `src/ports/README.md`, `tests/contract/README.md` with a short description of what each now actually contains
- [x] T040 Record `docs/decisions/ADR-001-consumer-idempotency-pattern.md` (status/version check, per `research.md` Decision 1) and `docs/decisions/ADR-002-hexagonal-ports.md` (the four ports and why no `UniversalCloudService`, per `research.md` Decision 2 and constitution Principle I)

## Dependencies & Execution Order

- **Setup (Phase 1)** → no dependencies, run first.
- **Foundational (Phase 2)** → depends on Setup. Blocks every user story.
- **User Story 1 (Phase 3)** → depends on Foundational only. This is the MVP slice.
- **User Story 2 (Phase 4)** → depends on Foundational **and** on the US1 use cases it extends
  (T017–T019 must exist before T028–T030 can extend them). Not independent of US1 in
  implementation order, but independently _testable_ once both exist.
- **User Story 3 (Phase 5)** → depends on Foundational only; does not depend on US1 or US2 code
  paths (different use case, different files). Could be implemented in parallel with US1/US2 by a
  second contributor.
- **Polish (Phase 6)** → depends on all user stories being complete.

## Parallel Execution Examples

Within Phase 2 (Foundational), after nothing else is running:

```text
T003, T004, T005, T006, T008, T009, T010, T011, T012  → all [P], different files, run together
T007  → after T003 (needs CreditApplication + ApplicationStatus defined)
T013, T014  → after T009-T012 (need port interfaces to implement against)
T015, T016  → after T003-T008 respectively
```

Within Phase 3 (US1), implementation tasks touch different files and can run in parallel once
Phase 2 is done:

```text
T017, T018, T019, T020  → [P], different files
T021, T022, T023, T024, T025, T026, T027  → [P], all test files, after their respective use case exists
```

## Implementation Strategy

**MVP first**: Complete Phase 1 → Phase 2 → Phase 3 (User Story 1) and stop there to validate the
core lifecycle end-to-end before adding idempotency (Phase 4) and document authorization
(Phase 5). This matches `docs/09-milestones-and-dod.md`'s M0 Definition of Done, which is
satisfied once the domain is runnable locally and the flow is explainable in capability terms —
User Story 1 alone already demonstrates that.

**Incremental delivery**: Phase 4 and Phase 5 can be delivered in either order after the MVP —
they touch disjoint concerns (idempotency hardening vs. a new use case) and neither blocks the
other.
