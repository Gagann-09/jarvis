import { describe, expect, it } from "vitest";
import { mockCareerProvider } from "../../src/providers/career/mock-career.provider.js";

describe("Career provider", () => {
  it("returns canonical career opportunities", async () => {
    const result = await mockCareerProvider.fetch({
      query: "AI ML internship",
      location: "Bangalore",
      remote: false,
    });

    expect(mockCareerProvider.name).toBe("mock-career-provider");
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.title).toContain("AI ML internship");
    expect(result.data?.[0]?.organization).toBe(
      "Mock Organization",
    );
    expect(result.data?.[0]?.source).toBe(
      "mock-career-source",
    );
    expect(result.source?.source).toBe(
      "mock-career-source",
    );
  });
});