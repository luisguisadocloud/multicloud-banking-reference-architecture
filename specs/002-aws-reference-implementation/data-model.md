# Phase 1 Infrastructure Data Model: M1 — AWS Reference Implementation

No new _domain_ entities — `CreditApplication`, `DocumentReference`, `EvaluateApplication`,
`ApplicationEvent` are reused unchanged from `specs/001-domain-and-contract/data-model.md`. This
document defines how those entities map onto AWS resources (per research.md Decisions 4–6).

## DynamoDB table

**Table**: `credit-applications` (name finalized with the naming convention from
`docs/06-terraform-and-iac.md` — project/poc identifier + `lab` environment tag).

| Attribute            | Type              | Role                                                                              |
| -------------------- | ----------------- | --------------------------------------------------------------------------------- |
| `applicationId`      | String            | Partition key (base table)                                                        |
| `idempotencyKey`     | String            | Partition key of GSI `idempotencyKey-index`                                       |
| `customerReference`  | String            |                                                                                   |
| `requestedAmount`    | Number            |                                                                                   |
| `status`             | String            |                                                                                   |
| `documentReferences` | List (Map)        | Embedded, mirrors M0's `DocumentReference[]`                                      |
| `riskScore`          | Number \| null    |                                                                                   |
| `decision`           | String \| null    |                                                                                   |
| `correlationId`      | String            |                                                                                   |
| `createdAt`          | String (ISO 8601) |                                                                                   |
| `updatedAt`          | String (ISO 8601) |                                                                                   |
| `version`            | Number            | Used by the optimistic-concurrency `ConditionExpression` (research.md Decision 5) |

**GSI**: `idempotencyKey-index` — partition key `idempotencyKey`, projects the full item
(`ProjectionType: ALL`) so `findByIdempotencyKey` needs no follow-up `GetItem`.

**Access pattern mapping** (`ApplicationRepository` → DynamoDB):

| Port method                      | DynamoDB operation                                                            |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `findById(applicationId)`        | `GetItem` on base table                                                       |
| `findByIdempotencyKey(key)`      | `Query` on `idempotencyKey-index`                                             |
| `save(application)` — creation   | `PutItem` with `ConditionExpression: attribute_not_exists(applicationId)`     |
| `save(application)` — transition | `PutItem`/`UpdateItem` with `ConditionExpression: version = :expectedVersion` |

## S3 bucket

**Bucket**: private, public access fully blocked, per `docs/architecture/03-aws.md`.

**Object key convention**: `{applicationId}/{documentType}/{documentId}` — matches the
`objectKey` shape already produced by M0's `InMemoryDocumentStorage` fake
(`applicationId/documentType/uuid`), so the adapter is a drop-in replacement with no shape change
visible to `src/application`.

**Upload mechanism**: `authorizeUpload` generates a presigned `PutObject` URL
(`@aws-sdk/s3-request-presigner`) with a short expiry (documented in the adapter, e.g. 15 minutes).

## SQS

**Queue**: `evaluation-queue` (Standard, research.md Decision 2).
**DLQ**: `evaluation-queue-dlq`, `maxReceiveCount` documented in Terraform (e.g. 3).
**Message body**: JSON-serialized `EvaluateApplication` (`messageId`, `applicationId`,
`correlationId`) — unchanged shape from M0.

## EventBridge

**Bus**: custom bus `credit-application-events` (research.md Decision 6).
**Rule**: matches `detail-type = "ApplicationEvaluated"`, source `credit-application-platform`.
**Targets**: `event-audit` Lambda, `event-notification` Lambda.
**Event detail**: JSON-serialized `ApplicationEvaluatedEvent` — unchanged shape from M0.

## Secrets Manager

**Secret**: `RISK_ENGINE_API_KEY` (fictitious value), retrieved by `worker-evaluate`'s execution
role only — no other Lambda's IAM policy grants `secretsmanager:GetSecretValue` on it.

## IAM (per research.md Decision 8)

> Corrected during implementation: presigning an S3 upload delegates real authorization to the
> signing role's own IAM permissions — without `s3:PutObject` on the role, S3 rejects the
> presigned URL when the client tries to upload. The original draft below under-specified this;
> `api-documents` does need `s3:PutObject`, scoped to the bucket.

| Lambda               | DynamoDB                                          | S3                                                    | SQS                                             | EventBridge             | Secrets Manager |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | ----------------------- | --------------- |
| `api-create`         | PutItem (create) + GSI Query (idempotency lookup) | —                                                     | —                                               | —                       | —               |
| `api-documents`      | GetItem, PutItem                                  | PutObject (scoped to bucket, required for presigning) | —                                               | —                       | —               |
| `api-submit`         | GetItem, PutItem                                  | —                                                     | SendMessage                                     | —                       | —               |
| `api-get`            | GetItem                                           | —                                                     | —                                               | —                       | —               |
| `worker-evaluate`    | GetItem, PutItem                                  | —                                                     | ReceiveMessage/DeleteMessage/GetQueueAttributes | PutEvents               | GetSecretValue  |
| `event-audit`        | —                                                 | —                                                     | —                                               | (event source, not IAM) | —               |
| `event-notification` | —                                                 | —                                                     | —                                               | (event source, not IAM) | —               |

## CloudWatch

- Log group per Lambda (created implicitly by the Lambda module, retention set explicitly rather
  than left at "never expire").
- Alarm: `evaluation-dlq-depth` — triggers when `ApproximateNumberOfMessagesVisible` on the DLQ is
  > 0, satisfying FR-011/SC-004.
