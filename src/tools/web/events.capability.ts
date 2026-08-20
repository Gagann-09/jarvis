import type { ToolCapability } from "../../types/tool.js";
import type {
  Event,
  EventsSearchInput,
} from "./events.schema.js";

export const eventsCapability: ToolCapability<
  EventsSearchInput,
  readonly Event[]
> = {
  definition: {
    name: "events_search",
    description: "Finds read-only AI, ML, and CSE events.",
    permission: "read",
  },

  async execute(input, _context) {
    const event: Event = {
      title: `AI/ML event for ${input.query}`,
      organizer: "Mock Events Organization",
      ...(input.location !== undefined && {
        location: input.location,
      }),
      url: "https://example.com/events/mock",
      description: "Deterministic event for contract testing.",
      startsAt: "2026-09-15T10:00:00.000Z",
      endsAt: "2026-09-15T16:00:00.000Z",
      source: "mock-events-source",
    };

    return {
      success: true,
      data: [event],
      source: {
        source: "mock-events-source",
        url: event.url,
        retrievedAt: new Date().toISOString(),
      },
      confidence: {
        score: 1,
        reason: "Deterministic mock event data.",
      },
    };
  },
};