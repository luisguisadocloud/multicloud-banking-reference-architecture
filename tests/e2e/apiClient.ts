// Thin HTTP client for the shared E2E suite. Talks to whatever BASE_URL points at — AWS today,
// Azure/GCP once M2/M3 exist — using the same OpenAPI contract, per
// docs/07-testing-failure-observability.md.

export interface HttpResult<T> {
  status: number;
  body: T;
}

function requireBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "BASE_URL environment variable is required to run the E2E suite (see tests/e2e/README.md)",
    );
  }
  return baseUrl;
}

async function toResult<T>(response: Response): Promise<HttpResult<T>> {
  const body = (await response.json()) as T;
  return { status: response.status, body };
}

export async function createApplication<T = unknown>(
  input: { customerReference: string; requestedAmount: number },
  idempotencyKey: string,
  correlationId?: string,
): Promise<HttpResult<T>> {
  const response = await fetch(`${requireBaseUrl()}/applications`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
      ...(correlationId ? { "x-correlation-id": correlationId } : {}),
    },
    body: JSON.stringify(input),
  });
  return toResult<T>(response);
}

export async function authorizeDocumentUpload<T = unknown>(
  applicationId: string,
  documentType: string,
): Promise<HttpResult<T>> {
  const response = await fetch(`${requireBaseUrl()}/applications/${applicationId}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: documentType }),
  });
  return toResult<T>(response);
}

export async function submitApplication<T = unknown>(
  applicationId: string,
): Promise<HttpResult<T>> {
  const response = await fetch(`${requireBaseUrl()}/applications/${applicationId}/submit`, {
    method: "POST",
  });
  return toResult<T>(response);
}

export async function getApplication<T = unknown>(applicationId: string): Promise<HttpResult<T>> {
  const response = await fetch(`${requireBaseUrl()}/applications/${applicationId}`);
  return toResult<T>(response);
}
