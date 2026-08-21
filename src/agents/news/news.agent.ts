import type { Agent, AgentResult } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import type {
  SearchInput,
  SearchResult,
} from "../../tools/web/search.schema.js";
import { newsFreshnessService } from "../../services/news/news-freshness.service.js";
import { newsReliabilityService } from "../../services/news/news-reliability.service.js";

export interface NewsInput {
  readonly topic: string;
}

export interface NewsOutput {
  readonly results: readonly SearchResult[];
}

export class NewsAgent implements Agent<NewsInput, NewsOutput> {
  readonly definition = {
    name: "news",
    description:
      "Finds read-only news information for a requested topic.",
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
            reason:
              "The search tool did not provide usable results.",
          },
          reason:
            "News search did not return usable results.",
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

    const rankedResults = normalizedResults
      .map((item, index) => {
        const freshness = newsFreshnessService.calculate(
          item.publishedAt,
        );

        const freshnessScore =
          item.publishedAt === undefined
            ? 0.5
            : freshness.score ?? 0;

        const providerName =
          item.provenance?.source ??
          result.source?.source ??
          "unknown";

        const reliabilityScore =
          newsReliabilityService.score(providerName);

        const rankingScore =
          reliabilityScore * 0.5 +
          freshnessScore * 0.5;

        return {
          item,
          index,
          rankingScore,
        };
      })
      .sort((a, b) => {
        const scoreDifference =
          b.rankingScore - a.rankingScore;

        return scoreDifference !== 0
          ? scoreDifference
          : a.index - b.index;
      })
      .map(({ item }) => item);

    const newestPublishedAt = rankedResults
      .map((item) => item.publishedAt)
      .filter(
        (value): value is string =>
          value !== undefined,
      )
      .sort()
      .at(-1);

    const freshness = newsFreshnessService.calculate(
      newestPublishedAt,
    );

    const confidenceScore =
      result.confidence?.score ?? 1;

    const providerNames = [
      ...new Set(
        rankedResults
          .map((item) => item.provenance?.source)
          .filter(
            (value): value is string =>
              value !== undefined,
          ),
      ),
    ];

    const aggregateReliability =
      providerNames.length === 0
        ? newsReliabilityService.score(
            result.source?.source ?? "unknown",
          )
        : providerNames.reduce(
            (total, providerName) =>
              total +
              newsReliabilityService.score(
                providerName,
              ),
            0,
          ) / providerNames.length;

    const freshnessMultiplier =
      freshness.publishedAt === undefined
        ? 1
        : 0.5 + (freshness.score ?? 0) * 0.5;

    const combinedConfidence =
      confidenceScore *
      aggregateReliability *
      freshnessMultiplier;

    return {
      success: true,
      data: {
        results: rankedResults,
      },
      decision: {
        status:
          combinedConfidence >= 0.5
            ? "accept"
            : "review",
        confidence: {
          score: combinedConfidence,
          reason:
            `Average provider reliability (${aggregateReliability}) ` +
            `and news freshness (${freshness.score ?? 0}) ` +
            "adjusted the search confidence.",
        },
        reason:
          combinedConfidence >= 0.5
            ? "News search completed with acceptable reliability and freshness."
            : "News search requires review due to reliability or freshness.",
      },
      ...(result.source !== undefined && {
        source: result.source,
      }),
      freshness,
    };
  }
}