# tests/e2e

Shared end-to-end suite driven purely by `BASE_URL`, run unmodified against AWS, Azure and GCP:

```bash
BASE_URL=<aws-url>   npm run test:e2e
BASE_URL=<azure-url> npm run test:e2e
BASE_URL=<gcp-url>   npm run test:e2e
```

Covers happy path, idempotency (duplicate request/submit/message), and failure engineering
scenarios (invalid payload, worker exception, missing permission, timeout, poison message,
downstream consumer failure). See `docs/07-testing-failure-observability.md`.

- `apiClient.ts` — thin `fetch`-based HTTP client, cloud-agnostic (only talks to `BASE_URL`).
- `pollUntilTerminal.ts` — polls `GET /applications/{id}` until a terminal status or timeout.
- `creditApplicationLifecycle.e2e.test.ts` — happy path + idempotency (M1 User Story 1).
- `forceFailureDeadLetter.e2e.test.ts` — `FORCE_FAILURE` → DLQ (M1 User Story 2); needs `DLQ_URL`
  in addition to `BASE_URL`.

Every suite here guards itself with `describe.skip` when the environment variables it needs are
absent, so `npm test` always discovers them (shown as "skipped") without requiring a live
deployment — only `BASE_URL`/`DLQ_URL` being set decides whether they actually run.
