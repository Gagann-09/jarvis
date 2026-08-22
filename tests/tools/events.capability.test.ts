import { describe, expect, it } from "vitest";
import { eventsCapability } from "../../src/tools/web/events.capability.js";
import { EventsSearchInputSchema } from "../../src/tools/web/events.schema.js";

describe("Events capability contract", () => {
  it("returns validated read-only events", async () => {
    const input = EventsSearchInputSchema.parse({
      query: "AI ML CSE events",
      location: "Bangalore",
    });

    const result = await eventsCapability.execute(input, {
      requestId: "events-test-001",
      permission: "read",
    });

    expect(eventsCapability.definition.name).toBe("events_search");
    expect(eventsCapability.definition.permission).toBe("read");

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

    expect(result.data?.[0]?.startsAt).toBe(
      "2026-09-15T10:00:00.000Z",
    );

    expect(result.source?.source).toBe(
      "mock-events-source",
    );

    expect(result.confidence?.score).toBe(1);
  });

  it("rejects prepare context with a controlled failure", async () => {
    const input = EventsSearchInputSchema.parse({
      query: "AI ML CSE events",
      location: "Bangalore",
    });

    const result = await eventsCapability.execute(input, {
      requestId: "events-test-prepare",
      permission: "prepare",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });

  it("rejects execute context with a controlled failure", async () => {
    const input = EventsSearchInputSchema.parse({
      query: "AI ML CSE events",
      location: "Bangalore",
    });

    const result = await eventsCapability.execute(input, {
      requestId: "events-test-execute",
      permission: "execute",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });
});