import type { EvaluationQueue } from "../../../src/ports/EvaluationQueue";
import type { EvaluateApplication } from "../../../src/domain/EvaluateApplication";

export class InMemoryEvaluationQueue implements EvaluationQueue {
  public readonly messages: EvaluateApplication[] = [];

  async enqueue(message: EvaluateApplication): Promise<void> {
    this.messages.push(message);
  }
}
