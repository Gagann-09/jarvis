import type { ToolCapability } from "../../types/tool.js";
import type {
  Event,
  EventsSearchInput,
} from "./events.schema.js";
import { mockEventsProvider } from "../../providers/events/mock-events.provider.js";
import { MeetupEventsProvider } from "../../providers/events/meetup-events.provider.js";
import { FallbackProvider } from "../../providers/fallback.provider.js";
import { FetchHttpClient } from "../../providers/http/http-client.js";

const httpClient = new FetchHttpClient();
const meetupEventsProvider = new MeetupEventsProvider(httpClient);

const fallbackEventsProvider = new FallbackProvider(
  meetupEventsProvider,
  mockEventsProvider,
);

export const eventsCapability: ToolCapability<
  EventsSearchInput,
  readonly Event[]
> = {
  definition: {
    name: "events_search",
    description: "Finds read-only AI, ML, and CSE events.",
    permission: "read",
  },

  async execute(input, context) {
    if (context.permission !== "read") {
      return {
        success: false,
        error: `Permission denied: Tool events_search requires read permission, but ${context.permission} was provided.`,
      };
    }

    const result = await fallbackEventsProvider.fetch(input);

    if (!result.success || result.data === undefined) {
      return {
        success: false,
        error: result.error ?? "Events provider failed.",
        ...(result.source !== undefined && {
          source: result.source,
        }),
        ...(result.provenance !== undefined && {
          provenance: result.provenance,
        }),
        ...(result.freshness !== undefined && {
          freshness: result.freshness,
        }),
      };
    }

    return {
      success: true,
      data: result.data,
      ...(result.source !== undefined && {
        source: result.source,
      }),
      ...(result.provenance !== undefined && {
        provenance: result.provenance,
      }),
      ...(result.freshness !== undefined && {
        freshness: result.freshness,
      }),
      confidence: {
        score: 1,
        reason: "Validated deterministic events provider result.",
      },
    };
  },
};