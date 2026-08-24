import type { Provider, ProviderResult } from "../../types/provider.js";
import type {
  SearchInput,
  SearchResult,
} from "../../tools/web/search.schema.js";

export const mockNewsProvider: Provider<
  SearchInput,
  readonly SearchResult[]
> = {
  name: "mock-news-provider",

  async fetch(
    input: SearchInput,
  ): Promise<ProviderResult<readonly SearchResult[]>> {
    return {
      success: true,
      data: [
        {
          title: `News result for ${input.query}`,
          url: "https://example.com/news/mock",
          snippet: "Deterministic mock news result.",
        },
      ],
      source: {
        source: "mock-news-provider",
        url: "https://example.com/news/mock",
        retrievedAt: new Date().toISOString(),
      },
    };
  },
};