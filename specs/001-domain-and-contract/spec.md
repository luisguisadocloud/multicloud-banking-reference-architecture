# Feature Specification: M0 — Domain & Contract

**Feature Branch**: `001-domain-and-contract`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "M0 — Domain & Contract: cloud-agnostic domain model, OpenAPI
contract, and hexagonal ports for the Digital Credit Application Processing Platform, executable
locally with no cloud SDK, per `docs/00-vision-and-scope.md`, `docs/01-business-case.md`,
`docs/architecture/02-logical-architecture.md`, and the M0 entry in `docs/09-milestones-and-dod.md`."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create, submit and track a credit application (Priority: P1)

An applicant creates a credit application, submits it once ready, and the system processes it
asynchronously through evaluation until it reaches a terminal decision, which the applicant can
then query.

**Why this priority**: This is the entire reason the domain exists. Without a working
create → submit → evaluate → terminal-status lifecycle, there is no MVP — every other capability
in this project (AWS, Azure, GCP adapters) exists only to run this same flow against real cloud
infrastructure.

**Independent Test**: Can be fully tested by running the domain and application layers locally
(no cloud SDK, no network) — create an application, submit it, invoke the evaluation use case
directly, and query the final status. Delivers a demonstrably working business flow independent of
any cloud implementation.

**Acceptance Scenarios**:

1. **Given** no prior application exists, **When** a client creates an application with a
   `customerReference` and `requestedAmount`, **Then** the system returns an `applicationId` and
   the application is in `DRAFT` status.
2. **Given** an application in `DRAFT`, **When** the client submits it, **Then** the application
   transitions to `SUBMITTED`/`EVALUATING` and an `EvaluateApplication` work item is produced.
3. **Given** an application in `EVALUATING`, **When** the evaluation use case runs with a
   `requestedAmount` in the "approve" range, **Then** the application transitions to `APPROVED` and
   an `ApplicationEvaluated` domain event is produced.
4. **Given** an evaluated application, **When** the client queries it, **Then** the response
   includes the current status and, if present, the decision result.

---

### User Story 2 - Idempotent request and message handling (Priority: P2)

The system must not create duplicate logical applications or produce duplicate evaluation effects
when a client retries a request or when an evaluation message is redelivered.

**Why this priority**: Banking-flavored async processing without idempotency is an unsafe design;
this is explicitly called out as mandatory in the approved specification
(`docs/00-vision-and-scope.md`, `docs/architecture/02-logical-architecture.md`). It is P2 rather
than P1 because the happy path (User Story 1) must exist first for idempotency to have something to
protect.

**Independent Test**: Can be tested independently by issuing the same creation request twice with
the same `Idempotency-Key` and asserting a single logical application exists, and by invoking the
evaluation use case twice for the same application and asserting a single recorded decision.

**Acceptance Scenarios**:

1. **Given** a client has already created an application with `Idempotency-Key: K`, **When** the
   client repeats the exact same creation request with `Idempotency-Key: K`, **Then** the system
   returns the same `applicationId` and does not create a second application.
2. **Given** an application already in `SUBMITTED`/`EVALUATING`, **When** submit is invoked again,
   **Then** the system does not enqueue a second effective evaluation.
3. **Given** an application that has already been evaluated, **When** the evaluation use case is
   invoked again for the same application (simulating message redelivery), **Then** the stored
   decision is not changed and no duplicate domain event side effects occur.

---

### User Story 3 - Authorize a document upload (Priority: P3)

An applicant requests authorization to upload a supporting document for their application; the
system returns time-limited upload authorization metadata rather than accepting the binary itself.

**Why this priority**: Needed for a complete business flow and explicitly required by the approved
spec, but the core lifecycle (User Story 1) and its idempotency guarantees (User Story 2) are more
critical to get right first. This capability can be developed, tested, and demonstrated on its own.

**Independent Test**: Can be tested independently by requesting upload authorization for an
existing `DRAFT` application and asserting the response contains a `DocumentReference` with the
metadata a client would need to perform a direct upload (object key, document type, application
association) — without any real storage backend, since M0 has no cloud adapters.

**Acceptance Scenarios**:

1. **Given** an application in `DRAFT`, **When** the client requests upload authorization for a
   document of a given type, **Then** the system returns a `DocumentReference` linked to the
   application.
2. **Given** an application that does not exist, **When** upload authorization is requested,
   **Then** the system rejects the request without creating a `DocumentReference`.

---

### Edge Cases

- What happens when a client tries to modify an application that is not in `DRAFT`? → Rejected;
  only `DRAFT` applications are mutable (`docs/01-business-case.md`).
- What happens when a client submits an application that was already submitted? → No new work is
  enqueued; handled as an idempotent no-op (User Story 2).
- What happens when the evaluation decision engine receives the `FORCE_FAILURE` test fixture value?
  → It deterministically produces a failure/rejection path used for failure-engineering tests later
  (M4); this fixture must live in test fixtures, not in production-shaped domain data
  (`docs/01-business-case.md`).
- What happens when a request payload is missing required fields (e.g. no `customerReference`)? →
  Rejected with no state mutation; a structured, testable validation error is returned.
- What happens when an application is queried before it has been evaluated? → Its current status
  (`DRAFT`, `SUBMITTED`, or `EVALUATING`) is returned with no decision result yet.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow creating a credit application with `customerReference` and
  `requestedAmount`, returning an `applicationId` and initial status `DRAFT`.
- **FR-002**: System MUST allow requesting time-limited upload authorization for a document
  associated with an existing application, producing a `DocumentReference` (object key, document
  type, application association) without transporting the document binary through application
  logic.
- **FR-003**: System MUST allow submitting a `DRAFT` application, transitioning it to
  `SUBMITTED`/`EVALUATING` and producing an `EvaluateApplication` work item.
- **FR-004**: System MUST reject state transitions that are not valid per the state machine
  `DRAFT → SUBMITTED → EVALUATING → {APPROVED | REJECTED | MANUAL_REVIEW}` (e.g. resubmitting a
  non-`DRAFT` application, editing a non-`DRAFT` application).
- **FR-005**: System MUST treat repeated creation requests carrying the same `Idempotency-Key` as a
  single logical application (no duplicate creation).
- **FR-006**: System MUST treat repeated submit requests for the same application as a no-op with
  respect to enqueued evaluation work (no duplicate effective evaluation).
- **FR-007**: System MUST process the `EvaluateApplication` work item idempotently: redelivery of
  the same work item MUST NOT change an already-recorded decision or produce duplicate
  `ApplicationEvaluated` events for the same evaluation.
- **FR-008**: System MUST resolve every evaluation to exactly one terminal status: `APPROVED`,
  `REJECTED`, or `MANUAL_REVIEW`, using a deterministic, explicitly fictitious decision engine based
  on `requestedAmount` ranges and an explicit test-only failure fixture (`FORCE_FAILURE`). This
  MUST NOT be presented as a real credit/risk model.
- **FR-009**: System MUST allow querying an application's current status and, once evaluated, its
  decision result.
- **FR-010**: System MUST propagate a `correlationId` across the create → submit → evaluate →
  domain-event flow, and every produced log/event MUST include it alongside `applicationId`.
- **FR-011**: System MUST reject invalid requests (missing/malformed required fields) without
  mutating any stored state.
- **FR-012**: System MUST expose the API surface (create, request-upload-authorization, submit,
  get) as a single OpenAPI contract (`openapi/credit-application-api.yaml`) with no cloud-provider-
  specific extensions.
- **FR-013**: Domain (`src/domain`) and application (`src/application`) layers MUST NOT import any
  AWS, Azure, or GCP SDK — cloud interaction happens exclusively through the ports defined in
  `src/ports` (`ApplicationRepository`, `DocumentStorage`, `EvaluationQueue`,
  `DomainEventPublisher`), per constitution Principle I.
- **FR-014**: System MUST be fully exercisable (all acceptance scenarios above) using in-memory/
  fake implementations of the ports, with no cloud credentials or cloud SDK installed.

### Key Entities

- **CreditApplication**: the credit request itself — `applicationId`, `customerReference`,
  `requestedAmount`, `status`, `documentReferences[]`, optional `riskScore`/`decision`,
  `createdAt`/`updatedAt`, optional `version` for optimistic concurrency.
- **DocumentReference**: a document associated with an application — `documentId`,
  `applicationId`, `type`, `objectKey`, `uploadedAt`.
- **EvaluateApplication**: the work item that requests asynchronous evaluation — `messageId`,
  `applicationId`, `correlationId`.
- **ApplicationEvent** (`ApplicationEvaluated`): the domain event published once an application has
  been evaluated — `eventId`, `eventType`, `applicationId`, `correlationId`, `result`, `timestamp`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer can run the complete application lifecycle (create → request upload
  authorization → submit → evaluate → query final status) locally with zero cloud credentials and
  zero cloud SDK installed.
- **SC-002**: 100% of the endpoints defined in the OpenAPI contract have at least one passing
  contract test validating request/response shape.
- **SC-003**: Issuing the same creation request twice with the same `Idempotency-Key` results in
  exactly one logical application existing, verified by automated test.
- **SC-004**: Redelivering the same evaluation work item twice results in exactly one recorded
  decision and at most one `ApplicationEvaluated` event with observable effect, verified by
  automated test.
- **SC-005**: All six business states (`DRAFT`, `SUBMITTED`, `EVALUATING`, `APPROVED`, `REJECTED`,
  `MANUAL_REVIEW`) are reachable and each is covered by at least one automated test.
- **SC-006**: Zero references to AWS/Azure/GCP SDKs exist in `src/domain` or `src/application`,
  verified by static inspection (lint rule or dependency check).

## Assumptions

- M0 does not integrate with any real cloud service. The ports (`ApplicationRepository`,
  `DocumentStorage`, `EvaluationQueue`, `DomainEventPublisher`) are exercised through in-memory/fake
  test doubles; real AWS/Azure/GCP adapters are built in M1/M2/M3 respectively
  (`docs/09-milestones-and-dod.md`).
- `GET /applications/{id}/events` is optional per the approved spec (`docs/01-business-case.md`)
  and is out of scope for M0 unless it is trivial to add once the domain model exists; it is not
  required for M0's Definition of Done.
- The document upload flow models only the authorization step (`DocumentReference` generation);
  actually performing a signed upload against a real object store is a per-cloud concern for
  M1/M2/M3, not M0.
- The decision engine is deterministic and explicitly fictitious; it is test/demo logic, not a real
  credit risk model, and must never be presented as one (`docs/01-business-case.md`).
- All identifiers and data used in examples and fixtures are synthetic (e.g. `CUSTOMER-001`,
  `APP-001`), per constitution Principle "no real banking or personal data".
- No git branch-per-feature automation is configured yet (no `.specify/extensions.yml` git hook);
  this spec and its implementation proceed on `main` directly, matching the bootstrap scope already
  agreed with the user.
