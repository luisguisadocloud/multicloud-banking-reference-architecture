# Feature Specification: M1 — AWS Reference Implementation

**Feature Branch**: `002-aws-reference-implementation`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "M1 AWS Reference Implementation: Terraform-provisioned API Gateway,
Lambda, DynamoDB, S3, SQS+DLQ, EventBridge, IAM, Secrets Manager and CloudWatch implementing the
M0 ports and OpenAPI contract natively on AWS, per `docs/architecture/03-aws.md`,
`docs/06-terraform-and-iac.md`, `docs/07-testing-failure-observability.md`, and the M1 entry in
`docs/09-milestones-and-dod.md`."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Deploy and run the credit application lifecycle on AWS (Priority: P1)

An operator runs `terraform apply` and gets a working AWS deployment of the same credit
application system already proven in M0 — the same OpenAPI contract, the same business flow,
now backed by real AWS services instead of in-memory fakes.

**Why this priority**: This is the reference implementation the rest of the multi-cloud project
(M2 Azure, M3 GCP) will be translated from. Without a working AWS deployment exercising the full
lifecycle, there is nothing to port and nothing to compare against.

**Independent Test**: Can be fully tested by running `terraform apply` in `infra/aws/`, then
running the shared E2E suite (`tests/e2e/`, already scaffolded in the bootstrap commit) with
`BASE_URL` pointed at the deployed API Gateway endpoint — no code changes to the test suite
itself, only a different `BASE_URL`.

**Acceptance Scenarios**:

1. **Given** a clean AWS account/region with no PoC resources, **When** `terraform apply` runs in
   `infra/aws/`, **Then** API Gateway, Lambda functions, DynamoDB table, S3 bucket, SQS queue +
   DLQ, EventBridge bus, IAM roles, a Secrets Manager secret, and CloudWatch log groups/alarms are
   created, and Terraform outputs the API base URL.
2. **Given** the deployed API, **When** a client runs the create → request-upload-authorization →
   submit → evaluate → get flow against it (same OpenAPI contract as M0), **Then** the application
   reaches a terminal status and the flow completes exactly as it does against the M0 in-memory
   implementation.
3. **Given** the deployed API, **When** the client requests document upload authorization,
   **Then** it receives a real S3 presigned URL (not an opaque test string as in M0) and can
   upload directly to S3 with it.
4. **Given** a submitted application, **When** the evaluation Lambda processes the SQS message,
   **Then** DynamoDB reflects the terminal status and EventBridge carries the
   `ApplicationEvaluated` event to the audit/notification consumers.

---

### User Story 2 - Diagnose a failure using AWS-native observability (Priority: P2)

An operator deliberately forces a failure (invalid permission, poison message, worker exception)
and must be able to find and explain it using only AWS Console/CloudWatch — not application logs
printed to a local terminal.

**Why this priority**: `docs/09-milestones-and-dod.md` makes this part of M1's Definition of Done
explicitly ("failure→retry→DLQ funcionan y pueden diagnosticarse desde AWS Console/CloudWatch") —
a deployment that only works on the happy path does not satisfy the milestone. It is P2 because the
deployment (User Story 1) must exist before there is anything to diagnose.

**Independent Test**: Can be tested independently by submitting an application that carries the
`FORCE_FAILURE` fixture already defined in the M0 domain, observing SQS redeliveries up to
`maxReceiveCount`, confirming the message lands in the DLQ, and locating the `correlationId` in
CloudWatch Logs across API Gateway, the Lambda functions, and the DLQ condition — independent of
whether User Story 1's full happy-path flow is being exercised at the same time.

**Acceptance Scenarios**:

1. **Given** a submitted application whose evaluation is forced to fail (`FORCE_FAILURE`),
   **When** the evaluation Lambda processes it repeatedly up to the queue's `maxReceiveCount`,
   **Then** the message is moved to the SQS Dead-Letter Queue.
2. **Given** a message in the DLQ, **When** the operator inspects the CloudWatch alarm tied to DLQ
   depth, **Then** the alarm reflects the condition (in `ALARM` state or with a visible metric
   breach).
3. **Given** a `correlationId` from a failed request, **When** the operator searches CloudWatch
   Logs across the API Lambda and the worker Lambda log groups, **Then** every log line for that
   operation is findable by that `correlationId`.
4. **Given** a Lambda execution role missing a permission it needs, **When** that Lambda attempts
   the disallowed action, **Then** the resulting AccessDenied/authorization error is visible in its
   CloudWatch Logs with enough detail to identify which permission is missing.

---

### User Story 3 - Tear down and recreate the environment reproducibly (Priority: P3)

An operator runs `terraform destroy` after a lab session and can later `terraform apply` again and
get back to the same working state, with no manually-created resource required in between.

**Why this priority**: `docs/06-terraform-and-iac.md` and constitution Principle IV
(Reproducibility First) make this a hard requirement for a personal lab meant to be applied,
inspected, and destroyed repeatedly. It is P3 because it depends on User Story 1's resources
existing first, but it is independently verifiable as its own scenario.

**Independent Test**: Can be tested independently by running `terraform destroy` after User Story
1's resources exist, verifying the destroy-verification checklist from
`docs/06-terraform-and-iac.md` (compute, database, storage, messaging, event resources, logs, IAM
identities), then running `terraform apply` again from the same, unmodified configuration and
confirming User Story 1's acceptance scenarios pass again.

**Acceptance Scenarios**:

1. **Given** a fully deployed AWS environment, **When** `terraform destroy` runs, **Then** every
   resource Terraform created is removed, and any resource that cannot be removed immediately
   (e.g. CloudWatch Logs retention, S3 versioned objects) is explicitly documented as such.
2. **Given** a destroyed environment, **When** `terraform apply` runs again with no configuration
   changes, **Then** the deployment succeeds and User Story 1's acceptance scenarios pass again,
   with no manual console step required in between.

---

### Edge Cases

- What happens when `POST /applications` is retried with the same `Idempotency-Key` against the
  real DynamoDB-backed adapter? → Same guarantee as M0 (FR-005 in `specs/001-domain-and-contract`):
  one logical application, now enforced through a DynamoDB conditional write rather than an
  in-memory map.
- What happens when SQS redelivers the same `EvaluateApplication` message before the first
  Lambda invocation's DynamoDB write has landed? → Must not produce two recorded decisions; see
  Functional Requirements below and `specs/001-domain-and-contract/research.md` Decision 1's note
  about this exact race being an adapter-level concern for M1+.
  the exact conditional-write approach is an implementation decision to record as an ADR during
  `/speckit-plan`, not decided here.
- What happens when the S3 presigned URL expires before the client uploads? → Client must request
  a new authorization; no state is corrupted by an expired-but-unused URL.
- What happens when `terraform destroy` is run but a Secrets Manager secret has a recovery window
  and does not disappear immediately? → Documented explicitly, not treated as a defect (per the
  destroy-verification checklist in `docs/06-terraform-and-iac.md`).
- What happens when the API Gateway receives a request for a nonexistent `applicationId`? → Same
  404 behavior already contractually defined by `openapi/credit-application-api.yaml` and proven
  in M0; this milestone verifies the AWS deployment preserves it end-to-end.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The AWS deployment MUST implement all four M0 ports (`ApplicationRepository`,
  `DocumentStorage`, `EvaluationQueue`, `DomainEventPublisher`) as adapters in `src/adapters/aws`,
  reusing the existing `src/domain` and `src/application` layers from M0 unchanged (constitution
  Principle I: domain/application stay cloud-agnostic).
- **FR-002**: The deployment MUST expose the exact same contract as
  `openapi/credit-application-api.yaml` (no cloud-specific fields added to request/response
  bodies) via API Gateway.
- **FR-003**: `POST /applications/{id}/documents` MUST return a real, time-limited S3 presigned
  URL that a client can use to upload directly to S3 without the request passing through
  application logic (per `docs/01-business-case.md`).
- **FR-004**: `POST /applications` MUST remain idempotent per `Idempotency-Key` when backed by
  DynamoDB (same guarantee as M0's `findByIdempotencyKey`, now via a real conditional write).
- **FR-005**: The evaluation Lambda MUST remain idempotent under SQS at-least-once redelivery —
  redelivering the same message MUST NOT produce a second recorded decision or a second
  `ApplicationEvaluated` event with observable effect.
- **FR-006**: A message that fails evaluation repeatedly MUST land in the SQS Dead-Letter Queue
  after a documented `maxReceiveCount`, without silently disappearing.
- **FR-007**: `ApplicationEvaluated` MUST be published to EventBridge and be routable to at least
  one downstream consumer (audit and/or notification Lambda), preserving `correlationId`.
- **FR-008**: Every Lambda function MUST execute under an IAM role granting only the permissions
  it needs (least privilege) — no Lambda may hold broader access than its own port adapter
  requires. No static/long-lived AWS credentials may be embedded in any Lambda.
- **FR-009**: At least one fictitious secret (e.g. `RISK_ENGINE_API_KEY`) MUST be stored in AWS
  Secrets Manager and retrieved by the relevant Lambda via its execution role — never hardcoded.
- **FR-010**: Every Lambda MUST emit structured logs to CloudWatch Logs carrying `correlationId`,
  `applicationId`, and `component`, consistent with the M0 observability contract
  (`docs/07-testing-failure-observability.md`).
- **FR-011**: At least one CloudWatch Alarm MUST exist covering a real operational failure
  condition (DLQ depth, error rate, or backlog) — not a decorative alarm with no actionable
  condition.
- **FR-012**: All AWS infrastructure MUST be defined in Terraform under `infra/aws/` and be fully
  creatable and destroyable via `terraform apply` / `terraform destroy`, using local state
  (constitution Principle IV; `docs/06-terraform-and-iac.md`).
- **FR-013**: The already-scaffolded shared E2E suite (`tests/e2e/`) MUST run unmodified against
  the deployed AWS endpoint by setting `BASE_URL`, covering at minimum: happy path, duplicate
  request (idempotency), worker failure + retry, and dead-letter scenario
  (`docs/07-testing-failure-observability.md` Definition of Done).
- **FR-014**: `terraform destroy` MUST remove every resource it created; any resource that cannot
  be removed immediately (retention/soft-delete behavior) MUST be documented, not silently ignored.

_No `[NEEDS CLARIFICATION]` markers — every requirement above is directly derived from the already
approved `docs/architecture/03-aws.md`, `docs/06-terraform-and-iac.md`,
`docs/07-testing-failure-observability.md`, and the M1 entry in `docs/09-milestones-and-dod.md`._

### Key Entities

This milestone introduces no new domain entities — it implements AWS-native persistence for the
entities already defined in `specs/001-domain-and-contract/data-model.md`
(`CreditApplication`, `DocumentReference`, `EvaluateApplication`, `ApplicationEvent`). The only new
"entities" here are infrastructure resources (DynamoDB table, S3 bucket, SQS queue + DLQ,
EventBridge bus, IAM roles, Secrets Manager secret, CloudWatch log groups/alarms), whose concrete
shape is a `/speckit-plan` design decision, not a spec-level one.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `terraform apply` from a clean state provisions a fully working deployment with zero
  manual console steps.
- **SC-002**: The shared E2E suite passes unmodified against the deployed AWS endpoint (same test
  code that will later run against Azure and GCP, per `docs/07-testing-failure-observability.md`).
- **SC-003**: A `correlationId` from any single operation (create, submit, evaluate) can be used to
  find every related log line across every Lambda involved, using only CloudWatch Logs.
  Equivalently: 100% of the operations exercised by the E2E suite are traceable end-to-end.
- **SC-004**: A message that always fails evaluation reaches the DLQ within the documented
  `maxReceiveCount`, verified by an automated or manual failure-engineering run.
- **SC-005**: `terraform destroy` followed by `terraform apply` (no config changes) reproduces a
  working deployment, verified at least once.
- **SC-006**: Zero static AWS credentials exist in any Lambda's code or environment variables —
  100% of AWS access happens through the Lambda's execution role.

## Assumptions

- Local Terraform state is used for M1, per `docs/06-terraform-and-iac.md` — remote state (S3
  backend) is an explicitly later exercise, not part of this milestone's scope.
- The operator has an AWS account and a local credential mechanism (profile/SSO) already available;
  provisioning or choosing that mechanism is a `/speckit-plan`-level decision to document, not a
  spec-level requirement, per `docs/06-terraform-and-iac.md`'s "Providers y autenticación local"
  guidance.
- API Gateway flavor (HTTP API vs REST API) and SQS flavor (Standard vs FIFO) are explicitly left
  as `/speckit-plan`/ADR decisions — `docs/architecture/03-aws.md` requires them to be chosen
  consciously and documented, not assumed here.
- The Risk Engine (containerized, ECS Fargate) and any VPC/networking are explicitly out of scope
  for M1 — they belong to M6 (V1.1), per `docs/00-vision-and-scope.md` and
  `docs/09-milestones-and-dod.md`.
- Actually running `terraform apply` against a real AWS account is a separate, explicit decision
  the user makes after reviewing this spec and the resulting plan/tasks — writing the Terraform
  and adapter code is in scope for the implementation phase that follows this spec; deploying it
  is not authorized by this spec alone.
