# Tasks: M1 — AWS Reference Implementation

**Input**: Design documents from `/specs/002-aws-reference-implementation/` (spec.md, plan.md,
research.md, data-model.md, contracts/, quickstart.md)

**Tests**: Required — `docs/09-milestones-and-dod.md` M1 lists "E2E tests" as a deliverable, and
spec Success Criteria SC-002 through SC-005 are only verifiable through the shared E2E suite and
adapter tests.

**⚠️ AWS boundary**: Tasks marked **[AWS-LIVE]** run commands against a real AWS account and
create/destroy real (low-cost) billable resources. Every other task only writes local code/config
and is safe to run without any AWS credentials. Do not run an **[AWS-LIVE]** task without the
user's explicit go-ahead at that point — this mirrors the boundary agreed for this milestone.

## Phase 1: Setup

- [ ] T001 [P] Add AWS SDK v3 runtime dependencies (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/client-sqs`, `@aws-sdk/client-eventbridge`, `@aws-sdk/client-secrets-manager`) to `package.json` `dependencies` (not devDependencies — these run inside the Lambda runtime)
- [ ] T002 [P] Create `tests/unit/adapters/aws/` directory
- [ ] T003 Run `npm install`
- [ ] T004 Verify `terraform` CLI is installed locally (`terraform version`) — no AWS credentials needed for this check

**Checkpoint**: toolchain ready, no AWS touched yet.

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The four AWS adapters and the Terraform resources they depend on. No user story can
be exercised before this phase completes. All tasks in this phase are local code/config only.

- [ ] T005 [P] Implement `DynamoDbApplicationRepository` (implements `ApplicationRepository`) per `data-model.md` access-pattern mapping in `src/adapters/aws/DynamoDbApplicationRepository.ts`
- [ ] T006 [P] Implement `S3DocumentStorage` (implements `DocumentStorage`, presigned `PutObject`) in `src/adapters/aws/S3DocumentStorage.ts`
- [ ] T007 [P] Implement `SqsEvaluationQueue` (implements `EvaluationQueue`) in `src/adapters/aws/SqsEvaluationQueue.ts`
- [ ] T008 [P] Implement `EventBridgeDomainEventPublisher` (implements `DomainEventPublisher`) in `src/adapters/aws/EventBridgeDomainEventPublisher.ts`
- [ ] T009 [P] Unit test `DynamoDbApplicationRepository` with the DynamoDB client mocked (conditional-write behavior per research.md Decision 5) in `tests/unit/adapters/aws/DynamoDbApplicationRepository.test.ts`
- [ ] T010 [P] Unit test `S3DocumentStorage` with the S3/presigner client mocked in `tests/unit/adapters/aws/S3DocumentStorage.test.ts`
- [ ] T011 [P] Unit test `SqsEvaluationQueue` with the SQS client mocked in `tests/unit/adapters/aws/SqsEvaluationQueue.test.ts`
- [ ] T012 [P] Unit test `EventBridgeDomainEventPublisher` with the EventBridge client mocked in `tests/unit/adapters/aws/EventBridgeDomainEventPublisher.test.ts`
- [ ] T013 [P] Terraform bootstrap files (`providers.tf`, `versions.tf`, `variables.tf`, `outputs.tf`, empty `main.tf` wiring modules) in `infra/aws/`
- [ ] T014 [P] Terraform `database` module — DynamoDB table + `idempotencyKey-index` GSI in `infra/aws/modules/database/`
- [ ] T015 [P] Terraform `storage` module — private S3 bucket, public access blocked in `infra/aws/modules/storage/`
- [ ] T016 [P] Terraform `messaging` module — SQS queue + DLQ + redrive policy in `infra/aws/modules/messaging/`
- [ ] T017 [P] Terraform `events` module — custom EventBridge bus + rule (research.md Decision 6) in `infra/aws/modules/events/`
- [ ] T018 [P] Terraform `identity` module scaffold — one IAM role per Lambda, empty policies to be filled in Phase 3 (research.md Decision 8) in `infra/aws/modules/identity/`
- [ ] T019 [P] Terraform `observability` module — CloudWatch log group per Lambda in `infra/aws/modules/observability/`
- [ ] T045 [P] Terraform: create the fictitious `RISK_ENGINE_API_KEY` Secrets Manager secret (FR-009) in `infra/aws/modules/identity/` — _added during `/speckit-analyze` consistency check, see Analysis Notes below_
- [ ] T046 [P] Shared structured-logging utility (`correlationId`, `applicationId`, `component`, `operation` — matches the observability contract in `docs/07-testing-failure-observability.md`) for all 7 Lambda handlers to use (FR-010) in `src/adapters/aws/logger.ts` — _added during `/speckit-analyze` consistency check, see Analysis Notes below_

**Checkpoint**: adapters compile and pass unit tests with mocked AWS clients; Terraform modules
`validate` cleanly (`terraform validate`, still no `apply`). Ready for User Story 1.

## Phase 3: User Story 1 - Deploy and run the credit application lifecycle on AWS (Priority: P1) 🎯 MVP

**Goal**: `terraform apply` produces a working AWS deployment of the full M0 business flow.

**Independent Test**: Run the shared E2E suite against the deployed `BASE_URL` per `quickstart.md`.

- [ ] T020 [US1] Implement Lambda handler `apiCreateApplication` (wraps `createApplication` use case) in `src/adapters/aws/handlers/apiCreateApplication.ts`
- [ ] T021 [US1] Implement Lambda handler `apiAuthorizeDocumentUpload` in `src/adapters/aws/handlers/apiAuthorizeDocumentUpload.ts`
- [ ] T022 [US1] Implement Lambda handler `apiSubmitApplication` in `src/adapters/aws/handlers/apiSubmitApplication.ts`
- [ ] T023 [US1] Implement Lambda handler `apiGetApplication` in `src/adapters/aws/handlers/apiGetApplication.ts`
- [ ] T024 [US1] Implement Lambda handler `workerEvaluateApplication` (SQS-triggered, wraps `evaluateApplication`) in `src/adapters/aws/handlers/workerEvaluateApplication.ts`
- [ ] T025 [US1] Implement Lambda handler `eventAuditHandler` (EventBridge-triggered, structured log per `docs/07-testing-failure-observability.md`) in `src/adapters/aws/handlers/eventAuditHandler.ts`
- [ ] T026 [US1] Implement Lambda handler `eventNotificationHandler` (EventBridge-triggered, mock/log notification per `docs/01-business-case.md`) in `src/adapters/aws/handlers/eventNotificationHandler.ts`
- [ ] T027 [US1] Terraform `compute` module — 7 Lambda functions, packaging, environment variables (table name, bucket name, queue URL, bus name, secret ARN) in `infra/aws/modules/compute/`
- [ ] T028 [US1] Fill in per-Lambda IAM policies in the `identity` module per `data-model.md`'s IAM table (research.md Decision 8) in `infra/aws/modules/identity/`
- [ ] T029 [US1] Terraform `api` module — HTTP API (research.md Decision 1), routes for the 4 OpenAPI operations, Lambda integrations in `infra/aws/modules/api/`
- [ ] T030 [US1] Wire `main.tf` to compose all modules; add `api_base_url` output
- [ ] T031 **[AWS-LIVE]** [US1] `terraform init && terraform plan && terraform apply` in `infra/aws/` — creates real AWS resources; requires the user's explicit go-ahead
- [ ] T032 **[AWS-LIVE]** [US1] Populate `tests/e2e/` with the happy-path scenario (create → authorize upload → submit → evaluate → get) and run it with `BASE_URL=<deployed URL>` against the real deployment

**Checkpoint**: User Story 1 acceptance scenarios pass against a real AWS deployment.

## Phase 4: User Story 2 - Diagnose a failure using AWS-native observability (Priority: P2)

**Goal**: A forced failure is diagnosable end-to-end using only CloudWatch.

**Independent Test**: Force `FORCE_FAILURE`, confirm DLQ landing and alarm state, trace by
`correlationId` in CloudWatch Logs — independent of whether Phase 3's full happy path is also
being exercised.

- [ ] T033 [P] [US2] Terraform CloudWatch alarm `evaluation-dlq-depth` in the `observability` module (FR-011) in `infra/aws/modules/observability/`
- [ ] T034 [P] [US2] Add a failure-engineering E2E test using the `FORCE_FAILURE` fixture, asserting the message reaches the DLQ within `maxReceiveCount`, in `tests/e2e/`
- [ ] T035 [US2] Write the AWS-specific debugging runbook (per `docs/07-testing-failure-observability.md`'s "Runbook de debugging" questions: where to start, how to search by correlationId, where the DLQ is, how to spot a permission error) in `docs/architecture/03-aws.md` (append an "Operational runbook" section) or a new `docs/architecture/03-aws-runbook.md`
- [ ] T036 **[AWS-LIVE]** [US2] Execute the User Story 2 acceptance scenarios against the real deployment (force failure, observe DLQ + alarm, trace by correlationId, confirm a permission-error log is legible) — requires the deployment from T031 to exist

**Checkpoint**: A failure is fully diagnosable via AWS Console/CloudWatch, matching M1's Definition
of Done in `docs/09-milestones-and-dod.md`.

## Phase 5: User Story 3 - Tear down and recreate the environment reproducibly (Priority: P3)

**Goal**: `terraform destroy` cleanly removes everything; a fresh `apply` reproduces the same
working state.

**Independent Test**: Run the destroy-verification checklist from `docs/06-terraform-and-iac.md`
after destroying, then re-apply and re-run Phase 3's E2E happy path.

- [ ] T037 **[AWS-LIVE]** [US3] `terraform destroy` in `infra/aws/` — removes the resources created in T031
- [ ] T038 [US3] Walk the destroy-verification checklist from `docs/06-terraform-and-iac.md` and record findings (e.g. CloudWatch log retention, Secrets Manager recovery window) in `docs/architecture/03-aws.md` or a dedicated notes section
- [ ] T039 **[AWS-LIVE]** [US3] `terraform apply` again with no configuration changes and re-run the Phase 3 E2E happy path to confirm reproducibility (SC-005)

**Checkpoint**: Reproducibility proven at least once, end to end.

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T040 [P] Record ADRs for research.md Decisions 1–8 under `docs/decisions/` (e.g. `ADR-003-api-gateway-http-vs-rest.md`, `ADR-004-sqs-standard-vs-fifo.md`, `ADR-005-lambda-granularity.md`, `ADR-006-dynamodb-key-design.md`, `ADR-007-conditional-writes.md`, `ADR-008-eventbridge-custom-bus.md`)
- [ ] T041 [P] Update `src/adapters/aws/README.md` and `infra/aws/README.md` placeholders (currently bootstrap stubs) with what each directory now actually contains
- [ ] T042 [P] Fill the AWS column of `docs/comparisons/08-aws-vs-azure-vs-gcp.md`'s "Plantilla de análisis por capability" section with real findings from this implementation (gotchas, Terraform resource count, cost observations)
- [ ] T043 Run `npm run lint`, `npm run build`, and `npm test` (unit + contract, not E2E) end-to-end and fix any violations
- [ ] T044 [P] Update `docs/09-milestones-and-dod.md` M1 checklist status once every acceptance scenario has been executed at least once
- [ ] T047 [P] Verify SC-006 (zero static AWS credentials): `grep -rEl "accessKeyId|secretAccessKey" src/adapters/aws` must return no matches — add this as a one-line check documented in `infra/aws/README.md` (or wired into `npm run lint` if a suitable rule exists) — _added during `/speckit-analyze` consistency check, see Analysis Notes below_

## Dependencies & Execution Order

- **Setup (Phase 1)** → no dependencies, run first, no AWS touched.
- **Foundational (Phase 2)** → depends on Setup. Blocks every user story. No AWS touched (Terraform
  files are written and `validate`d, not `apply`d).
- **User Story 1 (Phase 3)** → depends on Foundational. T020–T030 are local code; **T031 is the
  first task in this entire milestone that touches real AWS** and requires explicit user
  confirmation before running. T032 depends on T031.
- **User Story 2 (Phase 4)** → T033–T035 are local/documentation and can be done anytime after
  Foundational; T036 is AWS-live and depends on T031's deployment existing.
- **User Story 3 (Phase 5)** → depends on T031 (something must exist to destroy). Entirely
  AWS-live except T038 (writing up findings).
- **Polish (Phase 6)** → depends on all user stories being complete; T040–T042, T044 can start as
  soon as the relevant decisions/findings exist, T043 is local-only and safe to run anytime.

## Parallel Execution Examples

Within Phase 2 (Foundational), after Phase 1:

```text
T005, T006, T007, T008          → [P], different adapter files
T009, T010, T011, T012          → [P], after their respective adapter exists
T013, T014, T015, T016, T017, T018, T019  → [P], different Terraform module directories
```

Within Phase 3 (US1), before the AWS-live tasks:

```text
T020, T021, T022, T023, T024, T025, T026  → [P], different handler files
```

`T031` and everything after it in Phase 3 is strictly sequential — one deployment, one E2E run
against it.

## Implementation Strategy

**MVP first**: Complete Phase 1 → Phase 2 → Phase 3 and stop there to validate the core AWS
deployment before adding the observability drill-down (Phase 4) and the destroy/reproducibility
proof (Phase 5). This matches M1's Definition of Done, which already bundles happy path +
idempotency + failure→DLQ diagnosis — so in practice Phase 3 and Phase 4 are usually exercised
together in the same AWS session rather than as fully separate sittings, but they remain
independently testable and are kept as separate phases for clarity and incremental review.

**AWS-live tasks are the explicit go/no-go gate**: everything through the end of Phase 2 and the
non-`[AWS-LIVE]` tasks in Phase 3 can be implemented and reviewed with zero AWS cost or footprint.
The first `[AWS-LIVE]` task (T031) is where this milestone crosses from "write code" to "spend
money and touch a real account" — treat it as a separate decision point, not an automatic
continuation.
