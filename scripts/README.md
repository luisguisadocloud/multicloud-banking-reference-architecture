# scripts

- `build-lambda.mjs` — bundles each AWS Lambda handler (`src/adapters/aws/handlers/*.ts`) into a
  self-contained CommonJS file with esbuild, output to `dist-lambda/<handler>/index.js`. Run via
  `npm run build:lambda`; required before `terraform plan`/`apply` in `infra/aws/` — Terraform
  itself does not build this.

The `make deploy/test/destroy CLOUD=<aws|azure|gcp>` ergonomic wrapper from
`docs/06-terraform-and-iac.md` is not created yet — `infra/aws` is invoked directly today (see
`infra/aws/README.md`). Revisit once Azure/GCP (M2/M3) exist and the per-cloud commands are worth
unifying behind one interface.
