# tests/contract

Validates that the application layer's responses conform to the canonical
`openapi/credit-application-api.yaml` contract, using `openapiValidator.ts` (dereferences the spec
with `@apidevtools/swagger-parser`, validates with `ajv`; translates OpenAPI 3.0's `nullable: true`
into Ajv-compatible JSON Schema since Ajv does not understand it natively).

One file per endpoint: `createApplication`, `authorizeDocumentUpload`, `submitApplication`,
`getApplication`. `GET /applications/{id}/events` is out of scope for M0 (see `spec.md`
Assumptions), so it has no contract test.
