import { describe, expect, it } from "vitest";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { CareerSearchInputSchema } from "../../src/tools/web/career.schema.js";

describe("Career capability contract", () => {
  it("returns validated read-only career opportunities", async () => {
    const input = CareerSearchInputSchema.parse({
      query: "AI ML internship",
      location: "Bangalore",
      remote: false,
    });

    const result = await careerCapability.execute(input, {
      requestId: "career-test-001",
      permission: "read",
    });

    expect(careerCapability.definition.name).toBe("career_search");
    expect(careerCapability.definition.permission).toBe("read");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);

    expect(result.data?.[0]?.title).toContain("AI ML internship");
    expect(result.data?.[0]?.organization).toBe("Mock Organization");
    expect(result.data?.[0]?.source).toBe("mock-career-source");

    expect(result.source?.source).toBe("mock-career-source");
    expect(result.confidence?.score).toBe(1);
  });

  it("rejects prepare context with a controlled failure", async () => {
    const input = CareerSearchInputSchema.parse({
      query: "AI ML internship",
      location: "Bangalore",
    });

    const result = await careerCapability.execute(input, {
      requestId: "career-test-prepare",
      permission: "prepare",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });

  it("rejects execute context with a controlled failure", async () => {
    const input = CareerSearchInputSchema.parse({
      query: "AI ML internship",
      location: "Bangalore",
    });

    const result = await careerCapability.execute(input, {
      requestId: "career-test-execute",
      permission: "execute",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });
});