import type { EvaluateApplication } from "../domain/EvaluateApplication";

export interface EvaluationQueue {
  enqueue(message: EvaluateApplication): Promise<void>;
}
