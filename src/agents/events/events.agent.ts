import type { Agent, AgentResult } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import type {
  Event,
  EventsSearchInput,
} from "../../tools/web/events.schema.js";

export interface EventsInput {
  readonly query: string;
  readonly location?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface EventsOutput {
  readonly events: readonly Event[];
}

export class EventsAgent
  implements Agent<EventsInput, EventsOutput>
{
  readonly definition = {
    name: "events",
    description: "Finds read-only AI, ML, and CSE events.",
  };

  async execute(
    input: EventsInput,
    context: AgentContext,
  ): Promise<AgentResult<EventsOutput>> {
    const searchInput: EventsSearchInput = {
      query: input.query,
      ...(input.location !== undefined && {
        location: input.location,
      }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate,
      }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate,
      }),
    };

    const result = await context.capabilities.events.execute(
      searchInput,
      {
        requestId: context.requestId,
        permission: context.permission,
      },
    );

    if (!result.success || result.data === undefined) {
      return {
        success: false,
        decision: {
          status: "review",
          confidence: result.confidence ?? {
            score: 0,
            reason: "Events capability returned no usable results.",
          },
          reason: "Event search did not return usable events.",
        },
        error: result.error ?? "Event search failed.",
      };
    }

    return {
      success: true,
      data: {
        events: result.data,
      },
      decision: {
        status: "accept",
        confidence: result.confidence ?? {
          score: 0,
          reason: "No confidence metadata was provided.",
        },
        reason: "Event search completed successfully.",
      },
    };
  }
}