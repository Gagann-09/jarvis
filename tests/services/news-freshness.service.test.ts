import { describe, expect, it } from "vitest";
import { NewsFreshnessService } from "../../src/services/news/news-freshness.service.js";

describe("NewsFreshnessService", () => {
  const service = new NewsFreshnessService();

  const now = new Date("2026-08-21T12:00:00.000Z");

  it("scores very recent news as highly fresh", () => {
    const result = service.calculate(
      "2026-08-21T11:30:00.000Z",
      now,
    );

    expect(result.score).toBe(1);
    expect(result.ageMinutes).toBe(30);
  });

  it("scores one-day-old news as moderately fresh", () => {
    const result = service.calculate(
      "2026-08-20T12:00:00.000Z",
      now,
    );

    expect(result.score).toBe(0.6);
    expect(result.ageMinutes).toBe(1440);
  });

  it("scores old news as stale", () => {
    const result = service.calculate(
      "2026-08-01T12:00:00.000Z",
      now,
    );

    expect(result.score).toBe(0);
  });

  it("handles missing publication dates", () => {
    const result = service.calculate(undefined, now);

    expect(result.score).toBe(0);
    expect(result.publishedAt).toBeUndefined();
  });

  it("handles invalid publication dates", () => {
    const result = service.calculate(
      "not-a-date",
      now,
    );

    expect(result.score).toBe(0);
  });
});