# Quickstart: M1 — AWS Reference Implementation

Validation guide for the deployed AWS environment, mirroring the workflow already documented in
`docs/06-terraform-and-iac.md`. This is a run guide, not implementation code.

**This guide touches a real AWS account and creates real (low-cost) billable resources. Do not run
`terraform apply` until you have explicitly decided to do so** — writing the code from this
milestone's tasks does not itself deploy anything.

## Prerequisites

- An AWS account and a local named CLI profile with credentials configured (`aws configure` or
  SSO) — see research.md Decision 7. `AWS_PROFILE=<your-profile>` exported before every command
  below.
- Terraform installed.
- Node.js ≥ 20, `npm install` already run (adapter code is bundled for Lambda as part of the
  Terraform `compute` module).

## Deploy

```bash
cd infra/aws
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

Expected: Terraform outputs an API base URL (SC-001).

## Inspect the console

1. Locate the DynamoDB table and its `idempotencyKey-index` GSI.
2. Locate the S3 bucket; confirm public access is blocked.
3. Locate the SQS queue and its DLQ.
4. Locate the EventBridge custom bus and its rule.
5. Locate all 7 Lambda functions and their execution roles; confirm each role's policy only names
   what that Lambda needs (research.md Decision 8).
6. Locate the Secrets Manager secret; confirm only `worker-evaluate`'s role can read it.
7. Locate the CloudWatch alarm on DLQ depth.

## Run the shared E2E suite against the real deployment

```bash
BASE_URL=<terraform output api_base_url> npm run test:e2e
```

Expected: the same suite scaffolded in the bootstrap commit (`tests/e2e/`) passes unmodified
against the live endpoint — happy path, duplicate request, worker failure + retry, dead-letter
scenario (FR-013, SC-002).

## Force a failure and diagnose it (User Story 2)

1. Submit an application whose evaluation carries the `FORCE_FAILURE` fixture already defined in
   the M0 domain (`src/domain/decisionEngine.ts`).
2. Watch SQS redeliver the message up to `maxReceiveCount`, then land in the DLQ.
3. Confirm the `evaluation-dlq-depth` CloudWatch alarm reflects the condition.
4. Take the `correlationId` from the original request and search CloudWatch Logs across the
   `api-submit` and `worker-evaluate` log groups; confirm every related log line is findable by it
   (SC-003).

## Tear down and re-verify reproducibility (User Story 3)

```bash
terraform destroy
```

Then walk the destroy-verification checklist from `docs/06-terraform-and-iac.md` (compute,
database, storage, messaging, event resources, logs, IAM identities, anything with retention/soft
delete). Re-run `terraform apply` with no configuration changes and confirm the happy-path
scenario above passes again (SC-005).

## Definition of Done reminder

Per `docs/09-milestones-and-dod.md`: "Happy path + idempotency + failure→retry→DLQ funcionan y
pueden diagnosticarse desde AWS Console/CloudWatch." Every section above is exactly that check,
made concrete and runnable.
