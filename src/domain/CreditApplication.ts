import type { DocumentReference } from "./DocumentReference";

export type ApplicationStatus =
  "DRAFT" | "SUBMITTED" | "EVALUATING" | "APPROVED" | "REJECTED" | "MANUAL_REVIEW";

export type Decision = "APPROVED" | "REJECTED" | "MANUAL_REVIEW";

export interface CreditApplication {
  applicationId: string;
  customerReference: string;
  requestedAmount: number;
  status: ApplicationStatus;
  documentReferences: DocumentReference[];
  riskScore: number | null;
  decision: Decision | null;
  idempotencyKey: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
