import { decide } from "../../../src/domain/decisionEngine";

describe("decisionEngine.decide", () => {
  it("approves amounts below the manual-review threshold", () => {
    expect(decide(5_000)).toBe("APPROVED");
  });

  it("sends amounts at or above the manual-review threshold to MANUAL_REVIEW", () => {
    expect(decide(50_000)).toBe("MANUAL_REVIEW");
    expect(decide(100_000)).toBe("MANUAL_REVIEW");
  });

  it("is deterministic — same input always yields the same output", () => {
    expect(decide(12_345)).toBe(decide(12_345));
  });
});
