<!--
Sync Impact Report
Version change: [TEMPLATE] → 1.0.0
Modified principles: N/A (initial ratification, all 5 slots filled from source spec)
Added sections: Core Principles (I–V), Scope Boundaries, Development Workflow, Governance
Removed sections: none
Templates requiring updates: .specify/templates/plan-template.md (⚠ pending review at first /speckit-plan run),
  .specify/templates/spec-template.md (⚠ pending review), .specify/templates/tasks-template.md (⚠ pending review)
Follow-up TODOs: none — all placeholders resolved from the approved Notion specification
  ("Multicloud Banking Reference Architecture", pages 00–09, PoCs y Portfolio técnico)
-->

# Multicloud Banking Reference Architecture Constitution

## Core Principles

### I. Cloud-Agnostic Domain, Cloud-Native Infrastructure

The domain layer and use cases MUST NOT depend directly on AWS, Azure, or GCP SDKs. Infrastructure
MUST use each provider's native, idiomatic services rather than lowest-common-denominator
abstractions. A repository interface such as `ApplicationRepository` is a valid abstraction over
the domain's own needs; a `UniversalCloudDatabase` interface that hides provider differences is
not and MUST NOT be introduced.

**Rationale**: The learning objective is to reason about capabilities and translate them into
provider-native decisions — not to build a portability shim that erases the very differences the
project exists to study.

### II. Compare Capabilities, Not Memorize Service Names

Every cross-cloud decision MUST be framed as a capability question ("How does this cloud solve
asynchronous messaging? How does it represent workload identity? How does dead-letter handling
work here?"), not as a 1:1 name mapping. Statements such as "Pub/Sub is SQS for Google" or "Cosmos
DB is DynamoDB for Azure" are explicitly disallowed in project documentation; the required framing
is "these fulfill a comparable capability but differ in X, Y, Z."

**Rationale**: False equivalences produce shallow, incorrect multi-cloud knowledge — the opposite
of what this reference architecture is meant to build.

### III. Portable Does Not Mean Cross-Cloud Runtime

Each cloud implementation (AWS, Azure, GCP) MUST be deployable and operable entirely independently.
There MUST NOT be runtime traffic or coupling between clouds (e.g. AWS Lambda calling Azure Service
Bus). "Portable" means the same business problem, logical architecture, API contract, and test
suite are realized natively three times — not that the three deployments interoperate.

**Rationale**: A distributed multi-cloud runtime is a fundamentally different (and out-of-scope)
engineering problem from a portable cloud-native architecture.

### IV. Reproducibility First

Every relevant cloud resource MUST be defined as Terraform code and be creatable and destroyable
through a predictable `init → plan → apply → destroy` flow, per provider, under `infra/<cloud>/`.
Manual, unrepeatable console configuration for anything the project depends on functionally is
prohibited. State starts local (`*.tfstate` gitignored); remote state backends are an explicit
later exercise, not a V1 requirement.

**Rationale**: This is a personal lab meant to be applied, inspected, broken, and destroyed
repeatedly without cost or configuration drift accumulating between sessions.

### V. Operating Is Also Learning

A milestone is not done when an endpoint returns HTTP 200. Each cloud implementation MUST be
exercised through its console/portal, its logs, its metrics, and at least one deliberately induced
failure scenario (duplicate request, worker exception, permission error, poison message) before
being considered complete. Structured logging with `correlationId`, `applicationId`, and
`eventId`/`messageId` MUST be present so that an operation can be traced end-to-end in each
provider's native observability tooling.

**Rationale**: Passing a happy-path test proves the API works; it does not prove the operator
understands how the platform behaves under failure, which is the actual point of this lab.

## Scope Boundaries

The authoritative scope is `docs/00-vision-and-scope.md` (sourced verbatim from the approved
Notion specification). Summary for governance purposes:

- **V1 (mandatory)**: OpenAPI-first contract, serverless compute, NoSQL, object storage with
  signed temporary uploads, async messaging with retry + DLQ, event routing, workload identity
  (no static credentials), secrets management, structured logs, correlation ID, metrics, at least
  one operational alarm, idempotency, per-cloud Terraform, contract/integration/E2E tests, failure
  scenarios.
- **V1.1**: containerized Risk Engine (ECS Fargate / Container Apps / Cloud Run) with associated
  networking, deeper observability/tracing, CI/CD via GitHub Actions with OIDC federation.
- **V2 (optional)**: customer identity/OAuth2/OIDC, WAF, customer-managed encryption keys.
- **Explicitly out of scope**: Kubernetes (EKS/AKS/GKE), Kafka/event streaming, transactional SQL/
  ledger, orchestration engines (Step Functions/Durable Functions/Workflows), full multi-region/DR
  deployment, real AI/ML scoring, any real banking or personal data.

Any proposal to expand scope MUST answer four questions before being accepted: (1) does it help
compare the three clouds directly, (2) does it represent an important cloud architecture
capability, (3) can it be studied without duplicating a specialized future PoC, (4) does its
learning value justify its added cost. "It would make the diagram look more complete" is not a
valid justification.

## Development Workflow

The delivery strategy is T-shaped: AWS is the reference implementation (deepest), Azure and GCP are
deliberate ports that must reach a defensible hands-on level — not equivalent production depth.
Milestones proceed in strict order (M0 Domain & Contract → M1 AWS → M2 Azure → M3 GCP → M4 Failure
Engineering → M5 Observability → M6 Containers & Networking → M7 CI/CD → M8 Portfolio Polish), each
with its own Definition of Done in `docs/09-milestones-and-dod.md`. A milestone MUST NOT start
before the prior one meets its Definition of Done. Per-cloud operational workflow is: `terraform
init/plan/apply` → inspect the provider console → run the shared E2E suite → inspect
database/storage/queue/events → inspect logs/metrics/alarms → force a failure → diagnose retries/
permissions/DLQ → `terraform destroy`.

## Governance

This constitution supersedes ad-hoc implementation choices. Any AI or human contributor
implementing a feature MUST treat the approved specification (`docs/00-vision-and-scope.md` through
`docs/09-milestones-and-dod.md`) as source of truth and MUST NOT silently expand scope beyond it —
scope changes require an explicit amendment to both the relevant `docs/` page and this constitution
in the same commit.

Amendment procedure: propose the change, update the affected principle/section here and in
`docs/`, bump the version below per semantic versioning (MAJOR: incompatible principle removal/
redefinition; MINOR: new principle or materially expanded guidance; PATCH: clarification/wording),
and record the change in a Sync Impact Report comment at the top of this file.

**Version**: 1.0.0 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-08
