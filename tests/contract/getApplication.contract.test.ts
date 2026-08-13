import { createApplication } from "../../src/application/createApplication";
import { getApplication } from "../../src/application/getApplication";
import { InMemoryApplicationRepository } from "../unit/fakes/InMemoryApplicationRepository";
import { validateResponseBody } from "./openapiValidator";

describe("Contract: GET /applications/{applicationId}", () => {
  it("200 response matches the CreditApplication schema", async () => {
    const applications = new InMemoryApplicationRepository();
    const created = await createApplication(
      { customerReference: "CUSTOMER-001", requestedAmount: 5_000, idempotencyKey: "key-1" },
      { applications },
    );

    const found = await getApplication(created.applicationId, { applications });

    await validateResponseBody("getApplication", "200", found);
  });
});
