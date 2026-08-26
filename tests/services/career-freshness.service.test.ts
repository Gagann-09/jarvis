import { describe, expect, it } from "vitest";
import { CareerFreshnessService } from "../../src/services/career/career-freshness.service.js";

describe("CareerFreshnessService", () => {
  const service = new CareerFreshnessService();

  const now = new Date("2026-08-21T12:00:00.000Z");

  it("scores <= 1 day news as 1.0", () => {
    const result = service.calculate(
      "2026-08-20T12:00:00.000Z",
      now,
    );
    expect(result.score).toBe(1);
    expect(result.ageMinutes).toBe(1440);
  });

  it("scores <= 3 days news as 0.8", () => {
    const result = service.calculate(
      "2026-08-18T12:00:00.000Z",
      now,
    );
    expect(result.score).toBe(0.8);
    expect(result.ageMinutes).toBe(4320);
  });

  it("scores <= 7 days news as 0.6", () => {
    const result = service.calculate(
      "2026-08-14T12:00:00.000Z",
      now,
    );
    expect(result.score).toBe(0.6);
    expect(result.ageMinutes).toBe(10080);
  });

  it("scores <= 14 days news as 0.4", () => {
    const result = service.calculate(
      "2026-08-07T12:00:00.000Z",
      now,
    );
    expect(result.score).toBe(0.4);
    expect(result.ageMinutes).toBe(20160);
  });

  it("scores <= 30 days news as 0.2", () => {
    const result = service.calculate(
      "2026-07-22T12:00:00.000Z",
      now,
    );
    expect(result.score).toBe(0.2);
    expect(result.ageMinutes).toBe(43200);
  });

  it("scores > 30 days news as 0", () => {
    const result = service.calculate(
      "2026-07-21T11:59:00.000Z",
      now,
    );
    expect(result.score).toBe(0);
    expect(result.ageMinutes).toBe(44641);
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
