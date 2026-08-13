import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  AuthorizeUploadInput,
  DocumentStorage,
  UploadAuthorization,
} from "../../ports/DocumentStorage";

export interface S3DocumentStorageConfig {
  bucketName: string;
  /** Presigned URL expiry in seconds. Defaults to 15 minutes. */
  expirySeconds?: number;
  client?: S3Client;
}

export class S3DocumentStorage implements DocumentStorage {
  private readonly bucketName: string;
  private readonly expirySeconds: number;
  private readonly client: S3Client;

  constructor(config: S3DocumentStorageConfig) {
    this.bucketName = config.bucketName;
    this.expirySeconds = config.expirySeconds ?? 15 * 60;
    this.client = config.client ?? new S3Client({});
  }

  async authorizeUpload(input: AuthorizeUploadInput): Promise<UploadAuthorization> {
    const objectKey = `${input.applicationId}/${input.documentType}/${randomUUID()}`;

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
      { expiresIn: this.expirySeconds },
    );

    return { objectKey, uploadUrl };
  }
}
