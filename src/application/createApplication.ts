import { randomUUID } from "node:crypto";
import type { ApplicationRepository } from "../ports/ApplicationRepository";
import type { CreditApplication } from "../domain/CreditApplication";
import { InvalidApplicationRequestError } from "./errors";

export interface CreateApplicationInput {
  customerReference: string;
  requestedAmount: number;
  idempotencyKey: string;
  correlationId?: string;
}

export interface CreateApplicationDeps {
  applications: ApplicationRepository;
}

export async function createApplication(
  input: CreateApplicationInput,
  deps: CreateApplicationDeps,
): Promise<CreditApplication> {
  if (!input.customerReference) {
    throw new InvalidApplicationRequestError("customerReference is required");
  }
  if (!Number.isFinite(input.requestedAmount) || input.requestedAmount <= 0) {
    throw new InvalidApplicationRequestError("requestedAmount must be a positive number");
  }
  if (!input.idempotencyKey) {
    throw new InvalidApplicationRequestError("Idempotency-Key is required");
  }

  // FR-005: repeating the same Idempotency-Key returns the existing application instead of
  // creating a second one.
  const existing = await deps.applications.findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const application: CreditApplication = {
    applicationId: `APP-${randomUUID()}`,
    customerReference: input.customerReference,
    requestedAmount: input.requestedAmount,
    status: "DRAFT",
    documentReferences: [],
    riskScore: null,
    decision: null,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId ?? randomUUID(),
    createdAt: now,
    updatedAt: now,
    version: 0,
  };

  await deps.applications.save(application);
  return application;
}
