import type { Agent, AgentResult } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import {
  DecisionStatus,
  decisionStatusForConfidence,
  normalizeConfidence,
} from "../../types/decision.js";
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
      const confidence = normalizeConfidence(
        result.confidence,
        "Events capability returned no usable results.",
      );

      return {
        success: false,
        decision: {
          status: DecisionStatus.REVIEW,
          confidence,
          reason: "Event search did not return usable events.",
        },
        error: result.error ?? "Event search failed.",
      };
    }

    const confidence = normalizeConfidence(
      result.confidence,
      "No confidence metadata was provided.",
    );
    const decisionStatus = decisionStatusForConfidence(confidence);

    return {
      success: true,
      data: {
        events: result.data,
      },
      decision: {
        status: decisionStatus,
        confidence,
        reason:
          decisionStatus === DecisionStatus.ACCEPT
            ? "Event search completed successfully."
            : "Event search requires review due to confidence.",
      },
    };
  }
}
