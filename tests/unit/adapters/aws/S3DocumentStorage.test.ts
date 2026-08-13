import { S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { S3DocumentStorage } from "../../../../src/adapters/aws/S3DocumentStorage";

// getSignedUrl (from @aws-sdk/s3-request-presigner) signs locally using the client's config; it
// does not send a network request, so aws-sdk-client-mock's request interception does not apply
// to it. We only assert on the shape of what authorizeUpload returns.
describe("S3DocumentStorage", () => {
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    s3Mock.reset();
  });

  it("returns an objectKey scoped to applicationId/documentType and a URL pointing at the bucket", async () => {
    const storage = new S3DocumentStorage({
      bucketName: "credit-application-documents",
      client: new S3Client({
        region: "us-east-1",
        credentials: { accessKeyId: "test", secretAccessKey: "test" },
      }),
    });

    const authorization = await storage.authorizeUpload({
      applicationId: "APP-1",
      documentType: "income-proof",
    });

    expect(authorization.objectKey).toMatch(/^APP-1\/income-proof\//);
    expect(authorization.uploadUrl).toContain("credit-application-documents");
    expect(authorization.uploadUrl).toMatch(/^https:\/\//);
  });

  it("generates a different objectKey on every call", async () => {
    const storage = new S3DocumentStorage({
      bucketName: "credit-application-documents",
      client: new S3Client({
        region: "us-east-1",
        credentials: { accessKeyId: "test", secretAccessKey: "test" },
      }),
    });

    const first = await storage.authorizeUpload({
      applicationId: "APP-1",
      documentType: "income-proof",
    });
    const second = await storage.authorizeUpload({
      applicationId: "APP-1",
      documentType: "income-proof",
    });

    expect(first.objectKey).not.toBe(second.objectKey);
  });
});
