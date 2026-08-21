import { describe, expect, it } from "vitest";
import { NewsReliabilityService } from "../../src/services/news/news-reliability.service.js";

describe("NewsReliabilityService", () => {
  const service = new NewsReliabilityService();

  it("scores GDELT highly", () => {
    expect(
      service.score("gdelt-news-provider"),
    ).toBe(0.9);
  });

  it("scores Google News highly", () => {
    expect(
      service.score("google-news-provider"),
    ).toBe(0.85);
  });

  it("scores mock providers low", () => {
    expect(
      service.score("mock-news-provider"),
    ).toBe(0.2);
  });

  it("uses a neutral score for unknown providers", () => {
    expect(
      service.score("unknown-provider"),
    ).toBe(0.5);
  });
});