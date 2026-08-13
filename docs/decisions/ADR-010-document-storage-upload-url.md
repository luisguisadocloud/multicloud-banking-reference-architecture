# ADR-010 — DocumentStorage port was missing the upload URL

**Status**: accepted
**Date**: 2026-08-08
**Related**: `specs/002-aws-reference-implementation/research.md` Decision 9

## Context

M0's `UploadAuthorization` (`src/ports/DocumentStorage.ts`) returned only `objectKey`. Implementing
the real S3 adapter (`src/adapters/aws/S3DocumentStorage.ts`) surfaced that this made it
impossible for a client to actually perform the upload — `docs/01-business-case.md` requires "un
upload directo temporal... AWS S3 Presigned URL," which needs a URL, not just a key.

## Decision

Extended `UploadAuthorization` with a required `uploadUrl: string`.
`authorizeDocumentUpload`'s return type changed from `DocumentReference` to
`{ documentReference: DocumentReference; uploadUrl: string }` — the URL is not persisted (it is
short-lived), only returned in the HTTP response.
`openapi/credit-application-api.yaml`'s `POST /applications/{id}/documents` 201 schema changed
from `DocumentReference` to `DocumentUploadAuthorization` (`allOf: [DocumentReference, {
uploadUrl }]`).

## Consequences

- Fixed at the source (M0's port, use case, OpenAPI contract, `InMemoryDocumentStorage` fake, and
  their tests) rather than worked around in the AWS adapter — M2 (Azure/SAS) and M3 (GCP/signed
  URL) inherit the corrected contract instead of rediscovering the same gap.
- `objectKey` (stable) and `uploadUrl` (ephemeral, ~15 min expiry in the AWS adapter) remain
  distinct fields rather than being conflated — a stable storage key vs. a short-lived signed URL
  are genuinely different things with different lifetimes.
