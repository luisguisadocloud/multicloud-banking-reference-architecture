import { createApplication } from "../../../src/application/createApplication";
import { InvalidApplicationRequestError } from "../../../src/application/errors";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";

// FR-011: invalid requests are rejected without mutating any stored state.
describe("createApplication validation", () => {
  it("rejects a missing customerReference without persisting anything", async () => {
    const applications = new InMemoryApplicationRepository();

    await expect(
      createApplication(
        { customerReference: "", requestedAmount: 5_000, idempotencyKey: "key-1" },
        { applications },
      ),
    ).rejects.toBeInstanceOf(InvalidApplicationRequestError);

    expect(applications.history).toHaveLength(0);
  });

  it("rejects a non-positive requestedAmount without persisting anything", async () => {
    const applications = new InMemoryApplicationRepository();

    await expect(
      createApplication(
        { customerReference: "CUSTOMER-001", requestedAmount: 0, idempotencyKey: "key-2" },
        { applications },
      ),
    ).rejects.toBeInstanceOf(InvalidApplicationRequestError);

    expect(applications.history).toHaveLength(0);
  });

  it("rejects a missing Idempotency-Key without persisting anything", async () => {
    const applications = new InMemoryApplicationRepository();

    await expect(
      createApplication(
        { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "" },
        { applications },
      ),
    ).rejects.toBeInstanceOf(InvalidApplicationRequestError);

    expect(applications.history).toHaveLength(0);
  });
});
