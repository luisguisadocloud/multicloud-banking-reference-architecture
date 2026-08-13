# Contracts — M1 — AWS Reference Implementation

No contract changes. The canonical, single-source-of-truth API contract is still
[`openapi/credit-application-api.yaml`](../../../openapi/credit-application-api.yaml) — this
milestone implements it on AWS, it does not modify it (FR-002: no cloud-specific fields added).

Endpoint → Lambda mapping (API Gateway HTTP API integrations, research.md Decisions 1 & 3):

| OpenAPI operation         | Lambda          |
| ------------------------- | --------------- |
| `createApplication`       | `api-create`    |
| `authorizeDocumentUpload` | `api-documents` |
| `submitApplication`       | `api-submit`    |
| `getApplication`          | `api-get`       |

Non-HTTP consumers (not part of the OpenAPI contract, triggered by SQS/EventBridge instead of
API Gateway): `worker-evaluate` (consumes `EvaluateApplication` from SQS), `event-audit` and
`event-notification` (consume `ApplicationEvaluated` from EventBridge).

The same contract test suite from M0 (`tests/contract/*.contract.test.ts`) continues to validate
the _application-layer_ response shape; it does not need to change for M1, since it exercises
`src/application` use cases directly, not the deployed AWS endpoint. The shared E2E suite
(`tests/e2e/`) is what validates the real deployed API Gateway responses against the same contract.
