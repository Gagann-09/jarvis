import type { ToolCapability } from "../../types/tool.js";
import type {
  Event,
  EventsSearchInput,
} from "./events.schema.js";
import { mockEventsProvider } from "../../providers/events/mock-events.provider.js";

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
    const result = await mockEventsProvider.fetch(input);

    if (!result.success || result.data === undefined) {
      return {
        success: false,
        error: result.error ?? "Events provider failed.",
        ...(result.source !== undefined && {
          source: result.source,
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