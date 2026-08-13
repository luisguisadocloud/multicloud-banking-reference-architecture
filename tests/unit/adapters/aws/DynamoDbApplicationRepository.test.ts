import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDbApplicationRepository } from "../../../../src/adapters/aws/DynamoDbApplicationRepository";
import type { CreditApplication } from "../../../../src/domain/CreditApplication";

const ddbMock = mockClient(DynamoDBDocumentClient);

function buildApplication(overrides: Partial<CreditApplication> = {}): CreditApplication {
  return {
    applicationId: "APP-1",
    customerReference: "CUSTOMER-001",
    requestedAmount: 5_000,
    status: "DRAFT",
    documentReferences: [],
    riskScore: null,
    decision: null,
    idempotencyKey: "key-1",
    correlationId: "corr-1",
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
    version: 0,
    ...overrides,
  };
}

function firstCallInput<TInput>(calls: Array<{ args: [{ input: TInput }] }>): TInput {
  const [call] = calls;
  if (!call) {
    throw new Error("Expected at least one recorded command call");
  }
  return call.args[0].input;
}

describe("DynamoDbApplicationRepository", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  function buildRepository() {
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    return new DynamoDbApplicationRepository({
      tableName: "credit-applications",
      idempotencyIndexName: "idempotencyKey-index",
      client,
    });
  }

  it("uses attribute_not_exists on creation (version 0)", async () => {
    ddbMock.on(PutCommand).resolves({});
    const repository = buildRepository();
    const application = buildApplication({ version: 0 });

    await repository.save(application);

    const input = firstCallInput(ddbMock.commandCalls(PutCommand));
    expect(input.ConditionExpression).toBe("attribute_not_exists(applicationId)");
    expect(input.Item).toEqual(application);
  });

  it("uses a version-match condition on transitions (version > 0)", async () => {
    ddbMock.on(PutCommand).resolves({});
    const repository = buildRepository();
    const application = buildApplication({ version: 2, status: "SUBMITTED" });

    await repository.save(application);

    const input = firstCallInput(ddbMock.commandCalls(PutCommand));
    expect(input.ConditionExpression).toBe("version = :expectedVersion");
    expect(input.ExpressionAttributeValues).toEqual({ ":expectedVersion": 1 });
  });

  it("findById returns null when the item does not exist", async () => {
    ddbMock.on(GetCommand).resolves({});
    const repository = buildRepository();

    expect(await repository.findById("APP-missing")).toBeNull();
  });

  it("findById returns the item when it exists", async () => {
    const application = buildApplication();
    ddbMock.on(GetCommand).resolves({ Item: application });
    const repository = buildRepository();

    expect(await repository.findById(application.applicationId)).toEqual(application);
  });

  it("findByIdempotencyKey queries the GSI and returns null when nothing matches", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const repository = buildRepository();

    expect(await repository.findByIdempotencyKey("missing-key")).toBeNull();
    const input = firstCallInput(ddbMock.commandCalls(QueryCommand));
    expect(input.IndexName).toBe("idempotencyKey-index");
  });

  it("findByIdempotencyKey returns the matching item", async () => {
    const application = buildApplication();
    ddbMock.on(QueryCommand).resolves({ Items: [application] });
    const repository = buildRepository();
    const key = application.idempotencyKey;
    if (!key) {
      throw new Error("Test fixture must have an idempotencyKey");
    }

    expect(await repository.findByIdempotencyKey(key)).toEqual(application);
  });
});
