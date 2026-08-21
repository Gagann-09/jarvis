import type { Agent, AgentResult } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import type {
  SearchInput,
  SearchResult,
} from "../../tools/web/search.schema.js";
import { newsFreshnessService } from "../../services/news/news-freshness.service.js";

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
        ...(result.source !== undefined && {
          source: result.source,
        }),
        ...(result.freshness !== undefined && {
          freshness: result.freshness,
        }),
      };
    }

    const seenUrls = new Set<string>();

    const normalizedResults = result.data.filter((item) => {
      if (seenUrls.has(item.url)) {
        return false;
      }

      seenUrls.add(item.url);
      return true;
    });

    const newestPublishedAt = normalizedResults
      .map((item) => item.publishedAt)
      .filter((value): value is string => value !== undefined)
      .sort()
      .at(-1);

    const freshness = newsFreshnessService.calculate(
      newestPublishedAt,
    );

    const confidenceScore =
      result.confidence?.score ?? 1;
    
    const combinedConfidence =
    freshness.publishedAt === undefined
    ? confidenceScore
    : confidenceScore * 
      (0.5 + (freshness.score ?? 0) * 0.5);

    return {
      success: true,
      data: {
        results: normalizedResults,
      },
      decision: {
        status: combinedConfidence >= 0.5 ? "accept" : "review",
        confidence: {
          score: combinedConfidence,
          reason: `Provider confidence adjusted by news freshness (${freshness.score}).`,
        },
        reason:
          combinedConfidence >= 0.5
            ? "News search completed with acceptable freshness."
            : "News search completed but freshness requires review.",
      },
      ...(result.source !== undefined && {
        source: result.source,
      }),
      freshness,
    };
  }
}