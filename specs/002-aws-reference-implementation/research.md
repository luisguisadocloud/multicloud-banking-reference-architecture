# Phase 0 Research: M1 — AWS Reference Implementation

`docs/architecture/03-aws.md` explicitly asks several of these decisions to be made "consciously
and documented," not defaulted to. Each one below becomes an ADR once implementation starts.

## Decision 1: API Gateway flavor — HTTP API vs REST API

**Decision**: HTTP API.

**Rationale**: The contract (`openapi/credit-application-api.yaml`) needs simple request routing
to Lambda, header pass-through (`Idempotency-Key`, `X-Correlation-Id`), and standard 2xx/4xx JSON
responses — nothing here needs REST API's request/response transformation templates, resource
policies, or usage plans. HTTP API is materially cheaper and has a simpler Terraform surface,
which matters for a lab that gets destroyed and recreated repeatedly (constitution Principle IV).

**Alternatives considered**: REST API — rejected for M1; would be reconsidered only if a future
milestone needs WAF attached directly to the API Gateway resource (WAF is explicitly V2 scope per
`docs/00-vision-and-scope.md`) or fine-grained request validation beyond what the Lambda handlers
already do.

## Decision 2: SQS flavor — Standard vs FIFO

**Decision**: Standard queue.

**Rationale**: `docs/architecture/03-aws.md` explicitly warns not to assume FIFO automatically.
Nothing in the business flow requires strict cross-application ordering — each
`EvaluateApplication` message is independent, and idempotency is already handled at the
application layer (M0's status-check guard, ADR-001) rather than via SQS's dedup mechanism. FIFO
would add throughput limits and message-group complexity with no corresponding requirement here.

**Alternatives considered**: FIFO — rejected; would be revisited only if a future requirement
needs strict per-application message ordering, which none of M1's acceptance scenarios do.

## Decision 3: Lambda granularity — one function per responsibility

**Decision**: 7 separate Lambda functions (`api-create`, `api-documents`, `api-submit`,
`api-get`, `worker-evaluate`, `event-audit`, `event-notification`) rather than one monolithic
handler with internal routing.

**Rationale**: `docs/architecture/03-aws.md` already names this shape ("Funciones para:
create-application, submit-application, get-application, evaluate-application, audit-event").
One function per responsibility gives each Lambda its own IAM role scoped to exactly what it
touches (FR-008) — a monolithic handler would need the union of every permission, violating least
privilege by construction.

**Alternatives considered**: A single "api" Lambda with internal routing — rejected because it
would force one shared IAM role across create/documents/submit/get, each of which needs a
different DynamoDB/S3 permission subset.

## Decision 4: DynamoDB key design and idempotency-key lookup

**Decision**: Single table, partition key `applicationId` (string). A Global Secondary Index
`idempotencyKey-index` (partition key `idempotencyKey`) backs `findByIdempotencyKey`.
`documentReferences` stored as an embedded list attribute on the application item — no separate
table, mirroring M0's in-memory shape exactly.

**Rationale**: Every M0 access pattern (`findById`, `findByIdempotencyKey`, `save`) maps directly:
`findById` is a `GetItem` on the base table, `findByIdempotencyKey` is a `Query` on the GSI,
`save` is a `PutItem`/`UpdateItem`. No access pattern in M0's `ApplicationRepository` needs a scan.

**Alternatives considered**: A separate `IdempotencyKey` table/shadow-item
(`PK=IDEMPOTENCY#<key>`) — rejected as unnecessary complexity; a GSI is the idiomatic DynamoDB way
to support a second lookup key without a second write path to keep consistent.

## Decision 5: Conditional writes for idempotency and concurrency

**Decision**: `save` on creation uses `ConditionExpression: attribute_not_exists(applicationId)`.
`save` on every subsequent transition uses `ConditionExpression: version = :expectedVersion`
(optimistic concurrency, using the `version` field already in the M0 `CreditApplication` shape).

**Rationale**: The GSI lookup in Decision 4 prevents _logical_ duplicate creation at the
application layer (same guarantee as M0), but a conditional write adds a second, storage-level
guard against a true race (two concurrent creates with the same key landing before either GSI
read observes the other) — directly closing the race noted as an open risk in
`specs/001-domain-and-contract/research.md` Decision 1 and this spec's Edge Cases.

**Alternatives considered**: No conditional write, relying solely on the GSI read-before-write
check — rejected because it leaves the exact race window `research.md` flagged as a known M1+
concern.

## Decision 6: EventBridge bus

**Decision**: A dedicated custom event bus (not the account default bus), with one rule matching
`ApplicationEvaluated` events, targeting both the audit and notification Lambdas.

**Rationale**: `docs/architecture/03-aws.md` asks this to be justified explicitly. A custom bus
keeps this PoC's events isolated from anything else that might exist in the same AWS
account/region, and makes `terraform destroy` cleanly remove exactly and only this project's event
infrastructure.

**Alternatives considered**: Default bus — rejected to avoid any chance of interference with
unrelated account activity and to keep the destroy boundary unambiguous.

## Decision 7: AWS credentials for local Terraform runs

**Decision**: A named AWS CLI profile (`AWS_PROFILE` environment variable), documented in
`infra/aws/README.md`; no credentials committed anywhere in the repo.

**Rationale**: `docs/06-terraform-and-iac.md` requires documenting "exactamente el mecanismo
elegido" without storing credentials in the repo. A named profile (via `aws configure` or SSO) is
the standard, already-`.gitignore`d-safe mechanism for personal-account Terraform usage.

**Alternatives considered**: Hardcoded access keys in `.tfvars` — explicitly rejected; would
violate both this project's own security posture and constitution Principle I's spirit even though
that principle technically only governs `src/domain`/`src/application`.

## Decision 8: IAM least privilege — per-Lambda scoped policies

**Decision**: Each of the 7 Lambda execution roles gets its own IAM policy naming exactly the
resources/actions that Lambda's adapter code calls (e.g. `worker-evaluate`'s role gets
`dynamodb:GetItem`/`UpdateItem` on the table + `events:PutEvents` on the custom bus + SQS
`ReceiveMessage`/`DeleteMessage` on the evaluation queue — nothing else).

**Rationale**: Directly required by spec FR-008 and constitution's least-privilege expectation.
One-role-per-function (Decision 3) makes this straightforward — each role's policy is derivable
mechanically from which port adapter that Lambda uses.

**Alternatives considered**: One shared execution role for all Lambdas — rejected, defeats the
purpose of Decision 3's function-per-responsibility split.

## Decision 9: `DocumentStorage` port was missing the upload URL (discovered during implementation)

**Decision**: Extend `UploadAuthorization` (in `src/ports/DocumentStorage.ts`, defined in M0) with
a required `uploadUrl: string` field. Extend `authorizeDocumentUpload`'s return type from
`DocumentReference` to `{ documentReference: DocumentReference; uploadUrl: string }` — the URL is
not persisted as part of application state (it is short-lived), only returned in the HTTP
response. `openapi/credit-application-api.yaml`'s `POST /applications/{id}/documents` 201 response
schema changed from `DocumentReference` to a new `DocumentUploadAuthorization`
(`allOf: [DocumentReference, { uploadUrl }]`).

**Rationale**: Implementing the real S3 adapter surfaced that M0's port only returned `objectKey`
— there was no way for a client to actually perform the upload `docs/01-business-case.md` requires
("Devuelve información para upload directo temporal... AWS S3 Presigned URL"). This is a genuine
contract gap in M0, not a new capability — FR-003 of this milestone's own spec already required
"a real, time-limited S3 presigned URL that a client can use to upload directly to S3," which was
impossible to satisfy without this fix. Corrected at the source (port + use case + OpenAPI +
M0's `InMemoryDocumentStorage` fake + its tests) rather than worked around in the AWS adapter,
so Azure/GCP ports in M2/M3 inherit the corrected contract instead of rediscovering the same gap.

**Alternatives considered**: Smuggling the URL into `objectKey` — rejected, conflates two distinct
concepts (a stable storage key vs. an ephemeral signed URL) under one misleading name. Adding the
URL as a new field on `DocumentReference` itself — rejected, would persist a short-lived,
soon-invalid URL as part of the application's permanent state.

## Decision 10: `evaluateApplication` cannot take `testFlag` as a function parameter (discovered during implementation)

**Decision**: `evaluateApplication` no longer accepts `testFlag` as a third argument. It derives
the flag internally from the already-persisted application: `application.customerReference ===
FORCE_FAILURE_FLAG`. `decide()` itself is unchanged (still a pure function taking an explicit
`testFlag`) — only how `evaluateApplication` calls it changed.

**Rationale**: M0's `evaluateApplication(message, deps, testFlag?)` signature only made sense for
direct, in-process test invocation. An SQS-triggered Lambda worker in a real deployment has no
out-of-band channel to receive a function parameter — it only ever sees the SQS message body and
whatever it reads back from DynamoDB via `findById`. `docs/01-business-case.md` already described
the intended mechanism ("puede existir un campo... como FORCE_FAILURE") as data-carried, not
parameter-carried; M0's implementation had drifted from that. Corrected at the source (M0's
`evaluateApplication.ts` and its tests) so M2/GCP and M3/GCP inherit the same, deployment-workable
mechanism instead of each rediscovering it.

**Alternatives considered**: Adding a dedicated `testFlag` field to `EvaluateApplication` or
`CreditApplication` — rejected; would add a permanent, always-present field to production-shaped
domain data purely to carry a value that should only ever be test fixture data
(`customerReference` already serves that role without a schema change, per the source spec's own
suggestion).

## Decision 11: `recovery_window_in_days = 0` on the risk-engine-api-key secret (discovered during
lab iteration)

**Decision**: `aws_secretsmanager_secret.risk_engine_api_key` (`modules/identity/main.tf`) sets
`recovery_window_in_days = 0`, so `terraform destroy` deletes it immediately instead of AWS's
default 30-day scheduled-deletion window.

**Rationale**: Discovered during lab iteration — a prior `terraform destroy` left the secret in
AWS's "scheduled for deletion" state, and the next `terraform apply` failed with
`InvalidRequestException: You can't create this secret because a secret with this name is already
scheduled for deletion`. Secrets Manager reserves the name for the entire recovery window
regardless of Terraform state, so Terraform alone cannot recreate it. This secret carries only a
fictitious lab value (`jsonencode({ apiKey = "fictitious-lab-value-not-a-real-credential" })`),
so there is nothing worth protecting by keeping the recovery window — skipping it removes the
collision for every subsequent destroy/apply cycle. Confirms `docs/06-terraform-and-iac.md`'s
"Destroy verification checklist" item on provider-specific soft-delete/retention behavior with a
concrete AWS example.

**Alternatives considered**: Leaving the default 30-day window and force-deleting manually
(`aws secretsmanager delete-secret --force-delete-without-recovery`) whenever the collision
recurs — rejected as a recurring manual step in a lab meant for repeated destroy/apply cycles.
Restoring and `terraform import`ing the old secret instead of recreating — rejected, adds state
complexity to preserve a value that has no reason to persist.

## Output

All Technical Context fields in `plan.md` were already resolved. The eight decisions above are
the design-level unknowns Phase 1 (data-model.md, contracts, quickstart.md) and `/speckit-tasks`
build on. Each will be recorded as an ADR under `docs/decisions/` during implementation, mirroring
how M0 recorded ADR-001/ADR-002.
