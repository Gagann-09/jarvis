import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { careerCapability, validateCareerResult } from "../../src/tools/web/career.capability.js";
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

  it("allows prepare context to use read capability", async () => {
    const input = CareerSearchInputSchema.parse({
      query: "AI ML internship",
      location: "Bangalore",
    });

    const result = await careerCapability.execute(input, {
      requestId: "career-test-prepare",
      permission: "prepare",
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("allows execute context to use read capability", async () => {
    const input = CareerSearchInputSchema.parse({
      query: "AI ML internship",
      location: "Bangalore",
    });

    const result = await careerCapability.execute(input, {
      requestId: "career-test-execute",
      permission: "execute",
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  describe("Validation helper", () => {
    it("returns error when provider data is malformed", () => {
      const invalidResult = validateCareerResult({
        data: [{ title: "Only Title" }], // Missing other required fields
        source: { source: "test" },
      });

      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error).toBe("Career provider returned invalid opportunity data.");
        expect(invalidResult.source?.source).toBe("test");
      }
    });

    it("returns successful tool result when data is valid", () => {
      const validResult = validateCareerResult({
        data: [
          {
            title: "Valid Title",
            organization: "Org",
            location: "Location",
            url: "https://example.com",
            description: "A valid description",
            source: "mock-source",
          },
        ],
        source: { source: "test" },
      });

      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data).toHaveLength(1);
        expect(validResult.confidence?.reason).toContain("were combined.");
        expect(validResult.source?.source).toBe("test");
      }
    });
  });

  describe("Aggregate Freshness", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns freshness", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "Valid Title",
            organization: "Org",
            location: "Location",
            url: "https://example.com",
            description: "A valid description",
            source: "mock-source",
            publishedAt: "2026-08-20T12:00:00.000Z", // 1 day old
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.freshness).toBeDefined();
        expect(result.freshness?.score).toBe(1);
      }
    });

    it("uses newest opportunity to determine aggregate freshness", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "Oldest",
            organization: "Org",
            url: "https://example.com",
            description: "Desc",
            source: "mock",
            publishedAt: "2026-08-07T12:00:00.000Z", // 14 days old (0.4)
          },
          {
            title: "Newest",
            organization: "Org",
            url: "https://example.com",
            description: "Desc",
            source: "mock",
            publishedAt: "2026-08-19T12:00:00.000Z", // 2 days old (0.8)
          },
          {
            title: "Middle",
            organization: "Org",
            url: "https://example.com",
            description: "Desc",
            source: "mock",
            publishedAt: "2026-08-14T12:00:00.000Z", // 7 days old (0.6)
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.freshness?.score).toBe(0.8);
        expect(result.freshness?.publishedAt).toBe("2026-08-19T12:00:00.000Z");
      }
    });

    it("missing publication dates produce score 0", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "No Date",
            organization: "Org",
            url: "https://example.com",
            description: "Desc",
            source: "mock",
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.freshness?.score).toBe(0);
        expect(result.freshness?.publishedAt).toBeUndefined();
      }
    });

    it("existing source metadata remains intact", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "With Date",
            organization: "Org",
            url: "https://example.com",
            description: "Desc",
            source: "mock",
            publishedAt: "2026-08-20T12:00:00.000Z",
          },
        ],
        source: { source: "mock-provider-source", url: "https://provider.com", retrievedAt: "2026-08-21T12:00:00.000Z" },
        provenance: { sourceCount: 1, sources: [] }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.source?.source).toBe("mock-provider-source");
        expect(result.provenance?.sourceCount).toBe(1);
        expect(result.freshness?.score).toBe(1);
      }
    });
  });

  describe("Confidence Composition", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("fresh opportunity preserves confidence 1", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "T",
            organization: "O",
            url: "https://example.com",
            description: "D",
            source: "S",
            publishedAt: "2026-08-21T11:00:00.000Z",
          },
        ],
        confidence: { score: 1 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.confidence.score).toBe(1);
      }
    });

    it("older opportunity reduces confidence", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "T",
            organization: "O",
            url: "https://example.com",
            description: "D",
            source: "S",
            publishedAt: "2026-08-07T12:00:00.000Z", // 14 days old (score 0.4)
          },
        ],
        confidence: { score: 1 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.confidence.score).toBe(0.7); // 1 * (0.5 + 0.4 * 0.5)
      }
    });

    it("missing publication date does not reduce confidence", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "T",
            organization: "O",
            url: "https://example.com",
            description: "D",
            source: "S",
          },
        ],
        confidence: { score: 0.8 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.confidence.score).toBe(0.8);
      }
    });

    it("confidence never exceeds 1", () => {
      const result = validateCareerResult({
        data: [
          {
            title: "T",
            organization: "O",
            url: "https://example.com",
            description: "D",
            source: "S",
            publishedAt: "2026-08-21T11:00:00.000Z", // score 1
          },
        ],
        confidence: { score: 1.5 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.confidence.score).toBe(1);
      }
    });
  });
});