import path from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { OpenAPIV3 } from "openapi-types";

const OPENAPI_PATH = path.resolve(__dirname, "../../openapi/credit-application-api.yaml");

let cachedDocument: OpenAPIV3.Document | null = null;
const validatorCache = new Map<string, ValidateFunction>();

async function loadDereferencedDocument(): Promise<OpenAPIV3.Document> {
  if (!cachedDocument) {
    cachedDocument = (await SwaggerParser.dereference(OPENAPI_PATH)) as OpenAPIV3.Document;
  }
  return cachedDocument;
}

/**
 * Ajv validates plain JSON Schema and does not understand OpenAPI 3.0's `nullable: true`
 * extension keyword on its own — it must be translated into a `type` that includes `"null"`
 * before compiling, or `null` values (e.g. CreditApplication.decision before evaluation) fail
 * validation even though they are contractually valid.
 */
function applyOpenApiNullable(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(applyOpenApiNullable);
  }
  if (schema === null || typeof schema !== "object") {
    return schema;
  }

  const node = { ...(schema as Record<string, unknown>) };
  for (const [key, value] of Object.entries(node)) {
    node[key] = applyOpenApiNullable(value);
  }

  if (node.nullable === true) {
    delete node.nullable;
    if (typeof node.type === "string") {
      node.type = [node.type, "null"];
    } else if (Array.isArray(node.type)) {
      node.type = [...node.type, "null"];
    }
    if (Array.isArray(node.enum) && !node.enum.includes(null)) {
      node.enum = [...node.enum, null];
    }
  }

  return node;
}

function findOperation(
  document: OpenAPIV3.Document,
  operationId: string,
): { pathItem: OpenAPIV3.PathItemObject; operation: OpenAPIV3.OperationObject } {
  for (const pathItem of Object.values(document.paths ?? {})) {
    if (!pathItem) continue;
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      const operation = pathItem[method];
      if (operation && operation.operationId === operationId) {
        return { pathItem, operation };
      }
    }
  }
  throw new Error(`OpenAPI operation not found: ${operationId}`);
}

/**
 * Validates a response body against the schema declared for `operationId`/`status` in the
 * canonical OpenAPI contract (openapi/credit-application-api.yaml). Throws with Ajv's error
 * detail if the body does not conform.
 */
export async function validateResponseBody(
  operationId: string,
  status: string,
  body: unknown,
): Promise<void> {
  const document = await loadDereferencedDocument();
  const cacheKey = `${operationId}:${status}`;

  let validate = validatorCache.get(cacheKey);
  if (!validate) {
    const { operation } = findOperation(document, operationId);
    const response = operation.responses[status] as OpenAPIV3.ResponseObject | undefined;
    const schema = response?.content?.["application/json"]?.schema;
    if (!schema) {
      throw new Error(`No JSON schema declared for ${operationId} response ${status}`);
    }
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    validate = ajv.compile(applyOpenApiNullable(schema) as object);
    validatorCache.set(cacheKey, validate);
  }

  const valid = validate(body);
  if (!valid) {
    throw new Error(
      `Response for ${operationId} (${status}) does not match the OpenAPI contract: ` +
        JSON.stringify(validate.errors, null, 2),
    );
  }
}
