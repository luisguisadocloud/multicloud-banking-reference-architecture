import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { EvaluationQueue } from "../../ports/EvaluationQueue";
import type { EvaluateApplication } from "../../domain/EvaluateApplication";

export interface SqsEvaluationQueueConfig {
  queueUrl: string;
  client?: SQSClient;
}

export class SqsEvaluationQueue implements EvaluationQueue {
  private readonly queueUrl: string;
  private readonly client: SQSClient;

  constructor(config: SqsEvaluationQueueConfig) {
    this.queueUrl = config.queueUrl;
    this.client = config.client ?? new SQSClient({});
  }

  async enqueue(message: EvaluateApplication): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      }),
    );
  }
}
