import type { Provider } from "../../types/provider.js";
import type {
  SearchInput,
  SearchResult,
} from "../../tools/web/search.schema.js";
import { FetchHttpClient } from "../http/http-client.js";
import {
  GdeltResponseSchema,
} from "./gdelt.schema.js";

const GDELT_ENDPOINT =
  "https://api.gdeltproject.org/api/v2/doc/doc";

export class GdeltNewsProvider
  implements Provider<SearchInput, readonly SearchResult[]>
{
  readonly name = "gdelt-news-provider";

  constructor(
    private readonly httpClient = new FetchHttpClient(),
  ) {}

  async fetch(input: SearchInput) {
    const url = new URL(GDELT_ENDPOINT);

    url.searchParams.set("query", input.query);
    url.searchParams.set("mode", "artlist");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxrecords", "20");
    url.searchParams.set("sort", "datedesc");

    try {
      const raw =
        await this.httpClient.get<unknown>(url.toString());

      const parsed = GdeltResponseSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          success: false,
          error: "GDELT returned an invalid response.",
          source: {
            source: this.name,
            url: url.toString(),
            retrievedAt: new Date().toISOString(),
          },
        };
      }

      return {
        success: true,
        data: parsed.data.articles.map(
          (article): SearchResult => ({
            title: article.title,
            url: article.url,
            snippet: `${article.domain} · ${article.seendate}`,
          }),
        ),
        source: {
          source: this.name,
          url: url.toString(),
          retrievedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "GDELT request failed.",
        source: {
          source: this.name,
          url: url.toString(),
          retrievedAt: new Date().toISOString(),
        },
      };
    }
  }
}

export const gdeltNewsProvider =
  new GdeltNewsProvider();