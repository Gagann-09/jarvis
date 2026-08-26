import type { Agent, AgentResult } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import {
  DecisionStatus,
  decisionStatusForConfidence,
  normalizeConfidence,
} from "../../types/decision.js";
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
  implements Agent<CareerInput, CareerOutput> {
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
      const confidence = normalizeConfidence(
        result.confidence,
        "Career capability returned no usable results.",
      );

      return {
        success: false,
        decision: {
          status: DecisionStatus.REVIEW,
          confidence,
          reason: "Career search did not return usable opportunities.",
        },
        error: result.error ?? "Career search failed.",
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

    const confidence = normalizeConfidence(
      result.confidence,
      "No confidence metadata was provided.",
    );

    const decisionStatus =
      decisionStatusForConfidence(confidence);

    return {
      success: true,
      data: {
        opportunities: result.data,
      },
      decision: {
        status: decisionStatus,
        confidence,
        reason:
          decisionStatus === DecisionStatus.ACCEPT
            ? "Career search completed successfully."
            : "Career search requires review due to confidence.",
      },
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
}