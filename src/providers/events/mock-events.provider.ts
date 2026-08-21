import type { Provider } from "../../types/provider.js";
import type {
  Event,
  EventsSearchInput,
} from "../../tools/web/events.schema.js";

export const mockEventsProvider: Provider<
  EventsSearchInput,
  readonly Event[]
> = {
  name: "mock-events-provider",

  async fetch(input) {
    const event: Event = {
      title: `Event for ${input.query}`,
      organizer: "Mock Events Organization",
      ...(input.location !== undefined && {
        location: input.location,
      }),
      url: "https://example.com/events/mock",
      description: "Deterministic mock events provider result.",
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
    };
  },
};