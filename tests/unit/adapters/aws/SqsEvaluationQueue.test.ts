import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { mockClient } from "aws-sdk-client-mock";
import { SqsEvaluationQueue } from "../../../../src/adapters/aws/SqsEvaluationQueue";

const sqsMock = mockClient(SQSClient);

describe("SqsEvaluationQueue", () => {
  beforeEach(() => {
    sqsMock.reset();
  });

  it("sends the message JSON-serialized to the configured queue URL", async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: "sqs-message-1" });
    const queue = new SqsEvaluationQueue({
      queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/evaluation-queue",
      client: new SQSClient({}),
    });
    const message = { messageId: "msg-1", applicationId: "APP-1", correlationId: "corr-1" };

    await queue.enqueue(message);

    const [call] = sqsMock.commandCalls(SendMessageCommand);
    if (!call) {
      throw new Error("Expected SendMessageCommand to have been called");
    }
    expect(call.args[0].input.QueueUrl).toBe(
      "https://sqs.us-east-1.amazonaws.com/123456789012/evaluation-queue",
    );
    const body = call.args[0].input.MessageBody;
    expect(body).toBeDefined();
    expect(JSON.parse(body as string)).toEqual(message);
  });
});
