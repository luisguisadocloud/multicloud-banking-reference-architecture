import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ApplicationRepository } from "../../ports/ApplicationRepository";
import type { CreditApplication } from "../../domain/CreditApplication";

export interface DynamoDbApplicationRepositoryConfig {
  tableName: string;
  idempotencyIndexName: string;
  client?: DynamoDBDocumentClient;
}

/**
 * DynamoDB implementation of ApplicationRepository. `save` distinguishes creation from a state
 * transition by `application.version`: 0 means "new item, must not already exist"; any other
 * value means "must match the previously recorded version" — see
 * specs/002-aws-reference-implementation/research.md Decision 5.
 */
export class DynamoDbApplicationRepository implements ApplicationRepository {
  private readonly tableName: string;
  private readonly idempotencyIndexName: string;
  private readonly client: DynamoDBDocumentClient;

  constructor(config: DynamoDbApplicationRepositoryConfig) {
    this.tableName = config.tableName;
    this.idempotencyIndexName = config.idempotencyIndexName;
    this.client = config.client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async save(application: CreditApplication): Promise<void> {
    const isCreation = application.version === 0;

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: application,
        ConditionExpression: isCreation
          ? "attribute_not_exists(applicationId)"
          : "version = :expectedVersion",
        ExpressionAttributeValues: isCreation
          ? undefined
          : { ":expectedVersion": application.version - 1 },
      }),
    );
  }

  async findById(applicationId: string): Promise<CreditApplication | null> {
    const result = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { applicationId } }),
    );
    return (result.Item as CreditApplication | undefined) ?? null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<CreditApplication | null> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: this.idempotencyIndexName,
        KeyConditionExpression: "idempotencyKey = :idempotencyKey",
        ExpressionAttributeValues: { ":idempotencyKey": idempotencyKey },
        Limit: 1,
      }),
    );
    const [item] = result.Items ?? [];
    return (item as CreditApplication | undefined) ?? null;
  }
}
