import { randomUUID } from "node:crypto";
import type { ApplicationRepository } from "../ports/ApplicationRepository";
import type { DocumentStorage } from "../ports/DocumentStorage";
import type { DocumentReference } from "../domain/DocumentReference";
import { canMutate } from "../domain/applicationStateMachine";
import { ApplicationNotFoundError, InvalidStateTransitionError } from "./errors";

export interface AuthorizeDocumentUploadInput {
  applicationId: string;
  documentType: string;
}

export interface AuthorizeDocumentUploadDeps {
  applications: ApplicationRepository;
  documents: DocumentStorage;
}

export interface AuthorizeDocumentUploadResult {
  documentReference: DocumentReference;
  /** Time-limited URL/SAS/signed-URL the client uses to upload the document directly; not persisted. */
  uploadUrl: string;
}

export async function authorizeDocumentUpload(
  input: AuthorizeDocumentUploadInput,
  deps: AuthorizeDocumentUploadDeps,
): Promise<AuthorizeDocumentUploadResult> {
  const application = await deps.applications.findById(input.applicationId);
  if (!application) {
    throw new ApplicationNotFoundError(input.applicationId);
  }
  if (!canMutate(application.status)) {
    throw new InvalidStateTransitionError(
      `Cannot attach a document to application ${application.applicationId} in status ${application.status}`,
    );
  }

  const authorization = await deps.documents.authorizeUpload({
    applicationId: input.applicationId,
    documentType: input.documentType,
  });

  const documentReference: DocumentReference = {
    documentId: randomUUID(),
    applicationId: input.applicationId,
    type: input.documentType,
    objectKey: authorization.objectKey,
    uploadedAt: null,
  };

  await deps.applications.save({
    ...application,
    documentReferences: [...application.documentReferences, documentReference],
    updatedAt: new Date().toISOString(),
    version: application.version + 1,
  });

  return { documentReference, uploadUrl: authorization.uploadUrl };
}
