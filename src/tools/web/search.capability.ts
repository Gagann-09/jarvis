import type { Provider } from "../../types/provider.js";
import type { ToolCapability } from "../../types/tool.js";
import type {
  SearchInput,
  SearchResult,
} from "./search.schema.js";
import { FallbackProvider } from "../../providers/fallback.provider.js";
import { MultiSourceProvider } from "../../providers/multi-source.provider.js";
import { gdeltNewsProvider } from "../../providers/news/gdelt.provider.js";
import { googleNewsProvider } from "../../providers/news/google-news.provider.js";
import { mockNewsProvider } from "../../providers/news/mock-news.provider.js";

const googleNewsFallback = new FallbackProvider(
  googleNewsProvider,
  mockNewsProvider,
);

const newsProvider = new MultiSourceProvider<
  SearchInput,
  SearchResult
>([
  gdeltNewsProvider,
  googleNewsFallback,
]);

export const createSearchCapability = (
  provider: Provider<
    SearchInput,
    readonly SearchResult[]
  >,
): ToolCapability<
  SearchInput,
  readonly SearchResult[]
> => ({
  definition: {
    name: "search",
    description:
      "Searches for information using approved providers.",
    permission: "read",
  },

  async execute(input, context) {
    if (context.permission !== "read") {
      return {
        success: false,
        error: `Permission denied: Tool search requires read permission, but ${context.permission} was provided.`,
      };
    }

    const result = await provider.fetch(input);

    if (!result.success || result.data === undefined) {
      return {
        success: false,
        error:
          result.error ??
          "News provider failed.",
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
        reason:
          "Validated multi-source news result.",
      },
    };
  },
});

export const searchCapability =
  createSearchCapability(newsProvider);