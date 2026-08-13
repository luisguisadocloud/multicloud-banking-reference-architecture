import { createApplication } from "../../../src/application/createApplication";
import { getApplication } from "../../../src/application/getApplication";
import { ApplicationNotFoundError } from "../../../src/application/errors";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";

describe("getApplication", () => {
  it("returns the current state of an existing application", async () => {
    const applications = new InMemoryApplicationRepository();
    const created = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    const found = await getApplication(created.applicationId, { applications });

    expect(found).toEqual(created);
  });

  it("throws ApplicationNotFoundError for a non-existent application", async () => {
    const applications = new InMemoryApplicationRepository();

    await expect(getApplication("APP-does-not-exist", { applications })).rejects.toBeInstanceOf(
      ApplicationNotFoundError,
    );
  });
});
