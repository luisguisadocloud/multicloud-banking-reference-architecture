import type { ApplicationRepository } from "../ports/ApplicationRepository";
import type { CreditApplication } from "../domain/CreditApplication";
import { ApplicationNotFoundError } from "./errors";

export interface GetApplicationDeps {
  applications: ApplicationRepository;
}

export async function getApplication(
  applicationId: string,
  deps: GetApplicationDeps,
): Promise<CreditApplication> {
  const application = await deps.applications.findById(applicationId);
  if (!application) {
    throw new ApplicationNotFoundError(applicationId);
  }
  return application;
}
