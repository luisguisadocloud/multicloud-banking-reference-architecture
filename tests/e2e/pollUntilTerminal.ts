import { getApplication } from "./apiClient";
import type { ApplicationStatus } from "../../src/domain/CreditApplication";

const TERMINAL_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "APPROVED",
  "REJECTED",
  "MANUAL_REVIEW",
]);

export interface PolledApplication {
  applicationId: string;
  status: ApplicationStatus;
  [key: string]: unknown;
}

/** Polls GET /applications/{id} until it reaches a terminal status or the timeout elapses. */
export async function pollUntilTerminal(
  applicationId: string,
  { timeoutMs = 20_000, intervalMs = 1_000 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<PolledApplication> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await getApplication<PolledApplication>(applicationId);
    if (TERMINAL_STATUSES.has(result.body.status)) {
      return result.body;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Application ${applicationId} did not reach a terminal status within ${timeoutMs}ms`,
  );
}
