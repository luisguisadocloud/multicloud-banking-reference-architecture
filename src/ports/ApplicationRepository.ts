import type { CreditApplication } from "../domain/CreditApplication";

export interface ApplicationRepository {
  save(application: CreditApplication): Promise<void>;
  findById(applicationId: string): Promise<CreditApplication | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<CreditApplication | null>;
}
