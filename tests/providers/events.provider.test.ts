import { describe, expect, it } from "vitest";
import { mockEventsProvider } from "../../src/providers/events/mock-events.provider.js";

describe("Events provider", () => {
  it("returns canonical events", async () => {
    const result = await mockEventsProvider.fetch({
      query: "AI ML CSE events",
      location: "Bangalore",
    });

    expect(mockEventsProvider.name).toBe("mock-events-provider");
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);

    expect(result.data?.[0]?.title).toContain(
      "AI ML CSE events",
    );

    expect(result.data?.[0]?.organizer).toBe(
      "Mock Events Organization",
    );

    expect(result.data?.[0]?.source).toBe(
      "mock-events-source",
    );

    expect(result.source?.source).toBe(
      "mock-events-source",
    );
  });
});