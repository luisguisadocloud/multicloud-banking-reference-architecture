# Contracts — M0 — Domain & Contract

The canonical, single-source-of-truth API contract lives at
[`openapi/credit-application-api.yaml`](../../../openapi/credit-application-api.yaml) at the repo
root — not duplicated here — because `docs/architecture/02-logical-architecture.md` and the
project constitution already fix that location as part of the overall repository structure shared
by every milestone and every cloud port. Keeping a second copy under `specs/` would only invite
drift between the two.

Contract summary (see the OpenAPI file for the authoritative definitions):

| Endpoint                                       | Purpose                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `POST /applications`                           | Create a credit application (idempotent via `Idempotency-Key`)      |
| `POST /applications/{applicationId}/documents` | Request temporary upload authorization for a document               |
| `POST /applications/{applicationId}/submit`    | Submit a DRAFT application for asynchronous evaluation (idempotent) |
| `GET /applications/{applicationId}`            | Get current status and, if available, the decision                  |

`GET /applications/{applicationId}/events` is explicitly deferred (see `spec.md` Assumptions) — not
part of the M0 contract.
