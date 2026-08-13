export interface AuthorizeUploadInput {
  applicationId: string;
  documentType: string;
}

export interface UploadAuthorization {
  objectKey: string;
  /** Time-limited URL/SAS/signed-URL the client uses to upload the document directly. */
  uploadUrl: string;
}

export interface DocumentStorage {
  authorizeUpload(input: AuthorizeUploadInput): Promise<UploadAuthorization>;
}
