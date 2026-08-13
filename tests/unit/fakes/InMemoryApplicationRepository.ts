import type { ApplicationRepository } from "../../../src/ports/ApplicationRepository";
import type { CreditApplication } from "../../../src/domain/CreditApplication";

export class InMemoryApplicationRepository implements ApplicationRepository {
  private readonly byId = new Map<string, CreditApplication>();
  private readonly idByIdempotencyKey = new Map<string, string>();

  /** Every snapshot ever saved, in order — lets tests assert intermediate states were reached. */
  public readonly history: CreditApplication[] = [];

  async save(application: CreditApplication): Promise<void> {
    const snapshot = { ...application, documentReferences: [...application.documentReferences] };
    this.byId.set(application.applicationId, snapshot);
    this.history.push(snapshot);
    if (application.idempotencyKey) {
      this.idByIdempotencyKey.set(application.idempotencyKey, application.applicationId);
    }
  }

  async findById(applicationId: string): Promise<CreditApplication | null> {
    const application = this.byId.get(applicationId);
    return application
      ? { ...application, documentReferences: [...application.documentReferences] }
      : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<CreditApplication | null> {
    const applicationId = this.idByIdempotencyKey.get(idempotencyKey);
    return applicationId ? this.findById(applicationId) : null;
  }
}
