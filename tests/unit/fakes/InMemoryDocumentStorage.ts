import { randomUUID } from "node:crypto";
import type {
  AuthorizeUploadInput,
  DocumentStorage,
  UploadAuthorization,
} from "../../../src/ports/DocumentStorage";

export class InMemoryDocumentStorage implements DocumentStorage {
  async authorizeUpload(input: AuthorizeUploadInput): Promise<UploadAuthorization> {
    const objectKey = `${input.applicationId}/${input.documentType}/${randomUUID()}`;
    return { objectKey, uploadUrl: `https://fake-upload.local/${objectKey}` };
  }
}
