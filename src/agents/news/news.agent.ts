import type { Agent, AgentResult } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import type {
  SearchInput,
  SearchResult,
} from "../../tools/web/search.schema.js";

export interface NewsInput {
  readonly topic: string;
}

export interface NewsOutput {
  readonly results: readonly SearchResult[];
}

export class NewsAgent implements Agent<NewsInput, NewsOutput> {
  readonly definition = {
    name: "news",
    description: "Finds read-only news information for a requested topic.",
  };

  async execute(
    input: NewsInput,
    context: AgentContext,
  ): Promise<AgentResult<NewsOutput>> {
    const result = await context.capabilities.search.execute(
      {
        query: input.topic,
      } satisfies SearchInput,
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
            reason: "The search tool did not provide usable results.",
          },
          reason: "News search did not return usable results.",
        },
        error: result.error ?? "News search failed.",
      };
    }

    return {
      success: true,
      data: {
        results: result.data,
      },
      decision: {
        status: "accept",
        confidence: result.confidence ?? {
          score: 0,
          reason: "No confidence metadata was provided.",
        },
        reason: "News search completed successfully.",
      },
    };
  }
}