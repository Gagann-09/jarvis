import type { ToolCapability } from "../../types/tool.js";
import type { Provider } from "../../types/provider.js";
import type {
  SearchInput,
  SearchResult,
} from "./search.schema.js";
import { FallbackProvider } from "../../providers/fallback.provider.js";
import { gdeltNewsProvider } from "../../providers/news/gdelt.provider.js";
import { mockNewsProvider } from "../../providers/news/mock-news.provider.js";

const newsProvider = new FallbackProvider(
  gdeltNewsProvider,
  mockNewsProvider,
);

export const createSearchCapability = (
  provider: Provider<SearchInput, readonly SearchResult[]>,
): ToolCapability<SearchInput, readonly SearchResult[]> => ({
  definition: {
    name: "search",
    description: "Searches for information using an approved provider.",
    permission: "read",
  },

  async execute(input, _context) {
    const result = await provider.fetch(input);

    if (!result.success || result.data === undefined) {
      return {
        success: false,
        error: result.error ?? "News provider failed.",
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
        reason: "Validated news provider result.",
      },
    };
  },
});

export const searchCapability =
  createSearchCapability(newsProvider);