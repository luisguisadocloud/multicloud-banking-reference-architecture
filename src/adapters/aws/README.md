# adapters/aws

AWS implementations of the four M0 ports, plus shared Lambda-handler infrastructure. See
`specs/002-aws-reference-implementation/` for the full design and `docs/decisions/` (ADR-003 to
ADR-011) for the decisions behind it.

- `DynamoDbApplicationRepository.ts` — implements `ApplicationRepository` (DynamoDB + GSI, conditional writes; ADR-006, ADR-007).
- `S3DocumentStorage.ts` — implements `DocumentStorage` (S3 presigned upload URL; ADR-010).
- `SqsEvaluationQueue.ts` — implements `EvaluationQueue` (SQS Standard; ADR-004).
- `EventBridgeDomainEventPublisher.ts` — implements `DomainEventPublisher` (custom bus; ADR-008).
- `logger.ts` — structured logging shared by every handler (correlationId/applicationId/component/operation).
- `env.ts` — `requiredEnv()` helper for reading Lambda environment variables.
- `http.ts` — shared API Gateway request/response helpers (JSON parsing, header access, error→HTTP-status mapping).
- `handlers/` — the 7 Lambda entry points (ADR-005): 4 API-facing, 1 SQS worker, 2 EventBridge consumers.

Bundled for deployment with `npm run build:lambda` (esbuild, see `scripts/build-lambda.mjs`) — a
plain `tsc` build is not deployable as-is since it leaves `node_modules` unbundled.
