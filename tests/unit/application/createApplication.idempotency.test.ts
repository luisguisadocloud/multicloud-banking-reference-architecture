import { createApplication } from "../../../src/application/createApplication";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";

// SC-003: issuing the same creation request twice with the same Idempotency-Key results in
// exactly one logical application existing.
describe("createApplication idempotency", () => {
  it("returns the same application when the same Idempotency-Key is reused", async () => {
    const applications = new InMemoryApplicationRepository();
    const input = {
      customerReference: "CUSTOMER-001",
      requestedAmount: 5_000,
      idempotencyKey: "same-key",
    };

    const first = await createApplication(input, { applications });
    const second = await createApplication(input, { applications });

    expect(second.applicationId).toBe(first.applicationId);
    expect(applications.history.filter((snapshot) => snapshot.status === "DRAFT")).toHaveLength(1);
  });

  it("treats different Idempotency-Keys as different logical applications", async () => {
    const applications = new InMemoryApplicationRepository();

    const first = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-a" },
      { applications },
    );
    const second = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-b" },
      { applications },
    );

    expect(second.applicationId).not.toBe(first.applicationId);
  });
});
