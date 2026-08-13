# infra/aws

Terraform AWS provider — API Gateway (HTTP API), 7 Lambda functions, DynamoDB, S3, SQS + DLQ,
EventBridge, per-Lambda IAM roles, Secrets Manager, CloudWatch. Full design in
`specs/002-aws-reference-implementation/`, decisions in `docs/decisions/` (ADR-003 to ADR-011).

## Prerequisites

- AWS account with a local named CLI profile configured (`aws configure` or SSO) — no credentials
  are stored in this repo (`specs/002-aws-reference-implementation/research.md` Decision 7).
  Export `AWS_PROFILE=<your-profile>` before running any command below.
- Terraform CLI.
- Node.js ≥ 20, `npm install` already run at the repo root.

## Deploy

```bash
npm run build:lambda   # bundles the 7 Lambda handlers into dist-lambda/ (esbuild) — required
                        # before plan/apply; the compute module's data "archive_file" reads from
                        # dist-lambda/, Terraform does not build this itself.

cd infra/aws
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply         # creates real, billable AWS resources — explicit decision, not automatic
```

Terraform outputs `api_base_url` — use it as `BASE_URL` for the shared E2E suite
(`BASE_URL=<api_base_url> npm run test:e2e`).

## Structure

```
infra/aws/
├── main.tf / variables.tf / outputs.tf / providers.tf / versions.tf
└── modules/
    ├── database/        # DynamoDB table + idempotencyKey-index GSI
    ├── storage/          # Private S3 bucket for documents
    ├── messaging/          # SQS evaluation queue + DLQ
    ├── events/               # Custom EventBridge bus (rule+targets live in compute/, see ADR-008)
    ├── identity/               # Per-Lambda IAM roles/policies + the RISK_ENGINE_API_KEY secret
    ├── compute/                  # 7 Lambda functions, SQS event-source-mapping, EventBridge rule+targets
    ├── api/                        # HTTP API Gateway + routes + integrations
    └── observability/                # Log group per Lambda + DLQ-depth alarm
```

## Destroy

```bash
terraform destroy
```

Then walk the destroy-verification checklist in `docs/06-terraform-and-iac.md` (compute, database,
storage, messaging, event resources, logs, IAM identities, anything with retention/soft-delete
behavior) before assuming everything is gone.

## State

Local state only for this lab (`docs/06-terraform-and-iac.md`) — `*.tfstate*` is gitignored.
`.terraform.lock.hcl` **is** committed (standard Terraform practice for reproducible provider
version resolution).
