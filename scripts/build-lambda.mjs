// Bundles each AWS Lambda handler into a single self-contained CommonJS file with esbuild.
// A plain `tsc` build preserves the source directory tree and leaves node_modules unbundled,
// which is not deployable as-is (Lambda would need the whole node_modules tree zipped alongside
// it). Bundling with tree-shaking keeps each function's zip small and avoids depending on
// whichever AWS SDK version happens to ship with the Lambda runtime.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const handlersDir = path.join(rootDir, "src/adapters/aws/handlers");
const outDir = path.join(rootDir, "dist-lambda");

const handlers = [
  "apiCreateApplication",
  "apiAuthorizeDocumentUpload",
  "apiSubmitApplication",
  "apiGetApplication",
  "workerEvaluateApplication",
  "eventAuditHandler",
  "eventNotificationHandler",
];

for (const handler of handlers) {
  await build({
    entryPoints: [path.join(handlersDir, `${handler}.ts`)],
    outfile: path.join(outDir, handler, "index.js"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: false,
    minify: false,
  });
  console.log(`Bundled ${handler} -> dist-lambda/${handler}/index.js`);
}
