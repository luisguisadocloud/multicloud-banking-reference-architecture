import { createApplication } from "../../../src/application/createApplication";
import { InMemoryApplicationRepository } from "../fakes/InMemoryApplicationRepository";

describe("createApplication", () => {
  it("creates a DRAFT application and returns its applicationId", async () => {
    const applications = new InMemoryApplicationRepository();

    const application = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    expect(application.applicationId).toMatch(/^APP-/);
    expect(application.status).toBe("DRAFT");
    expect(application.customerReference).toBe("CUSTOMER-001");
    expect(application.requestedAmount).toBe(5_000);
    expect(await applications.findById(application.applicationId)).toEqual(application);
  });

  it("generates a correlationId when none is supplied", async () => {
    const applications = new InMemoryApplicationRepository();

    const application = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-2" },
      { applications },
    );

    expect(application.correlationId).toBeTruthy();
  });
});
