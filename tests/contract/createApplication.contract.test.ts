import { createApplication } from "../../src/application/createApplication";
import { InMemoryApplicationRepository } from "../unit/fakes/InMemoryApplicationRepository";
import { validateResponseBody } from "./openapiValidator";

describe("Contract: POST /applications", () => {
  it("201 response matches the CreditApplication schema", async () => {
    const applications = new InMemoryApplicationRepository();

    const application = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    await validateResponseBody("createApplication", "201", application);
  });
});
