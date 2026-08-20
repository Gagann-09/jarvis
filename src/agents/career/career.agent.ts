import type { Agent, AgentResult } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "../../tools/web/career.schema.js";

export interface CareerInput {
  readonly query: string;
  readonly location?: string;
  readonly remote?: boolean;
}

export interface CareerOutput {
  readonly opportunities: readonly CareerOpportunity[];
}

export class CareerAgent
  implements Agent<CareerInput, CareerOutput>
{
  readonly definition = {
    name: "career",
    description: "Finds read-only career opportunities.",
  };

  async execute(
    input: CareerInput,
    context: AgentContext,
  ): Promise<AgentResult<CareerOutput>> {
    const searchInput: CareerSearchInput = {
      query: input.query,
      ...(input.location !== undefined && {
        location: input.location,
      }),
      ...(input.remote !== undefined && {
        remote: input.remote,
      }),
    };

    const result = await context.capabilities.career.execute(
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
            reason: "Career capability returned no usable results.",
          },
          reason: "Career search did not return usable opportunities.",
        },
        error: result.error ?? "Career search failed.",
      };
    }

    return {
      success: true,
      data: {
        opportunities: result.data,
      },
      decision: {
        status: "accept",
        confidence: result.confidence ?? {
          score: 0,
          reason: "No confidence metadata was provided.",
        },
        reason: "Career search completed successfully.",
      },
    };
  }
}