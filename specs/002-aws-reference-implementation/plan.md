# Implementation Plan: M1 — AWS Reference Implementation

**Branch**: `002-aws-reference-implementation` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-aws-reference-implementation/spec.md`

## Summary

Implement AWS-native adapters for the four M0 ports (`ApplicationRepository` → DynamoDB,
`DocumentStorage` → S3 presigned URLs, `EvaluationQueue` → SQS+DLQ, `DomainEventPublisher` →
EventBridge), wire them behind API Gateway + Lambda exposing the exact M0 OpenAPI contract, and
provision everything via Terraform under `infra/aws/`. `src/domain` and `src/application` are
reused unchanged from M0 — this milestone only adds adapters and infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.7 on Node.js 20 (same as M0; Lambda runtime `nodejs20.x`).

**Primary Dependencies**: AWS SDK v3 — `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`,
`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/client-sqs`,
`@aws-sdk/client-eventbridge`, `@aws-sdk/client-secrets-manager`. Scoped exclusively to
`src/adapters/aws` — the ESLint `no-restricted-imports` override already in `.eslintrc.json` only
covers `src/domain`/`src/application`, so these imports are allowed here by design.

**Storage**: Amazon DynamoDB — single table, partition key `applicationId`, GSI on
`idempotencyKey` for `findByIdempotencyKey`. Documents referenced by embedded list attribute
(mirrors M0's `documentReferences[]`), no separate table.

**Testing**: Jest (existing config) for adapter unit tests with the AWS SDK v3 clients mocked at
the client level; the existing shared `tests/e2e/` suite run against the real deployed
`BASE_URL`, per spec FR-013/SC-002. No LocalStack/AWS mocking framework introduced — deliberately
kept simple per constitution Principle IV (avoid infrastructure the destroy flow doesn't already
cover).

**Target Platform**: AWS Lambda (`nodejs20.x`), fronted by API Gateway; SQS/EventBridge/DynamoDB/S3
as fully managed dependencies. No VPC — Lambdas call AWS managed services directly (networking is
explicitly M6/V1.1 scope, not M1).

**Project Type**: Single project — extends the existing repo skeleton with `src/adapters/aws/` and
`infra/aws/` on top of the already-committed M0 domain/application/ports.

**Performance Goals**: None contractually required by the spec. Operational constraint: Lambda
timeout set generously (10s API-facing, 30s worker) to avoid false-failure noise while
failure-engineering scenarios are being designed, not tuned for throughput.

**Constraints**: AWS SDK usage confined to `src/adapters/aws` (FR-001); IAM least privilege, no
static credentials (FR-008, SC-006); local Terraform state only (FR-012); shared E2E suite must
run unmodified (FR-013).

**Scale/Scope**: 7 Lambda functions (`api-create`, `api-documents`, `api-submit`, `api-get`,
`worker-evaluate`, `event-audit`, `event-notification`), 1 DynamoDB table + 1 GSI, 1 S3 bucket,
1 SQS queue + 1 DLQ, 1 EventBridge bus + 1 rule, 1 Secrets Manager secret, ≥1 CloudWatch alarm.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                             | Status   | Notes                                                                                                                                                                                                                          |
| ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Cloud-Agnostic Domain, Cloud-Native Infrastructure | **PASS** | AWS SDK confined to `src/adapters/aws`; `src/domain`/`src/application` untouched from M0. Enforced by the existing ESLint override (scoped to those two directories only, so it does not block this milestone's adapter code). |
| II. Compare Capabilities, Not Memorize Names          | **PASS** | This milestone is the reference AWS implementation the M2/M3 ports will be compared against — no premature cross-cloud comparison happens here, that's `docs/comparisons/08-aws-vs-azure-vs-gcp.md`'s job once M2/M3 exist.    |
| III. Portable Does Not Mean Cross-Cloud Runtime       | **PASS** | Nothing in this plan calls Azure or GCP. The AWS deployment is fully self-contained.                                                                                                                                           |
| IV. Reproducibility First                             | **PASS** | Everything provisioned via Terraform under `infra/aws/`, local state, full `apply`/`destroy` cycle required by spec FR-012/FR-014/SC-005.                                                                                      |
| V. Operating Is Also Learning                         | **PASS** | Spec User Story 2 and FR-010/FR-011/SC-003/SC-004 explicitly require CloudWatch-based diagnosis of a forced failure, not just a passing happy path.                                                                            |
| Scope Boundaries (V1/V1.1/V2/out-of-scope)            | **PASS** | No networking/VPC, no containers (Risk Engine), no CI/CD, no customer identity — all correctly deferred to M6/M7/V2 per spec Assumptions.                                                                                      |

No violations. Complexity Tracking table intentionally left empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-aws-reference-implementation/
├── spec.md
├── plan.md                # This file
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output (infrastructure data model)
├── quickstart.md           # Phase 1 output
├── contracts/
│   └── README.md           # Points to the unchanged openapi/credit-application-api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md                 # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── domain/, application/, ports/   # UNCHANGED from M0 — reused as-is
└── adapters/
    └── aws/
        ├── DynamoDbApplicationRepository.ts
        ├── S3DocumentStorage.ts
        ├── SqsEvaluationQueue.ts
        ├── EventBridgeDomainEventPublisher.ts
        └── handlers/
            ├── apiCreateApplication.ts
            ├── apiAuthorizeDocumentUpload.ts
            ├── apiSubmitApplication.ts
            ├── apiGetApplication.ts
            ├── workerEvaluateApplication.ts
            ├── eventAuditHandler.ts
            └── eventNotificationHandler.ts

infra/aws/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── versions.tf
└── modules/
    ├── api/            # API Gateway (HTTP API) + routes/integrations
    ├── compute/        # 7 Lambda functions + packaging
    ├── database/        # DynamoDB table + GSI
    ├── storage/          # S3 bucket (private, presigned uploads)
    ├── messaging/         # SQS queue + DLQ
    ├── events/             # EventBridge bus + rule
    ├── identity/            # Per-Lambda IAM roles/policies, least privilege
    └── observability/        # CloudWatch log groups + alarm(s)

tests/
├── unit/adapters/aws/    # NEW — adapter unit tests with AWS SDK v3 clients mocked
└── e2e/                   # UNCHANGED test code from bootstrap; now actually populated and run
                           # against BASE_URL=<deployed API Gateway URL>
```

**Structure Decision**: Single project, same as M0 — this milestone is purely additive
(`src/adapters/aws/`, `infra/aws/`, `tests/unit/adapters/aws/`), touching zero files inside
`src/domain`, `src/application`, or `src/ports`. `tests/unit/adapters/aws/` is a new subdirectory
(not explicitly in the original repo tree, which only names `tests/unit` as added in M0's
research.md) — justified the same way M0 justified `tests/unit/`: adapter tests are a distinct
concern from domain/application unit tests and from E2E tests.
