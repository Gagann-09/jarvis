import type { Provider, ProviderResult } from "../../types/provider.js";
import type {
  SearchInput,
  SearchResult,
} from "../../tools/web/search.schema.js";
import { FetchHttpClient } from "../http/http-client.js";

const GOOGLE_NEWS_ENDPOINT =
  "https://news.google.com/rss/search";

export class GoogleNewsProvider
  implements Provider<SearchInput, readonly SearchResult[]>
{
  readonly name = "google-news-provider";

  constructor(
    private readonly httpClient = new FetchHttpClient(),
  ) {}

  async fetch(input: SearchInput): Promise<ProviderResult<readonly SearchResult[]>> {
    const url = new URL(GOOGLE_NEWS_ENDPOINT);

    url.searchParams.set("q", input.query);
    url.searchParams.set("hl", "en-IN");
    url.searchParams.set("gl", "IN");
    url.searchParams.set("ceid", "IN:en");

    try {
      const xml = await this.httpClient.getText(
        url.toString(),
      );

      const results = this.parseRss(xml);

      return {
        success: true,
        data: results,
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
            : "Google News request failed.",
        source: {
          source: this.name,
          url: url.toString(),
          retrievedAt: new Date().toISOString(),
        },
      };
    }
  }

  private parseRss(xml: string): readonly SearchResult[] {
    const items = [
      ...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi),
    ];

    return items
      .map((match) => {
        const item = match[1];

        if (!item) {
          return undefined;
        }

        const title = this.extractTag(item, "title");
        const link = this.extractTag(item, "link");
        const description =
          this.extractTag(item, "description");

        if (!title || !link) {
          return undefined;
        }

        return {
          title: this.decodeXml(title),
          url: this.decodeXml(link),
          snippet: this.decodeXml(description ?? ""),
        };
      })
      .filter(
        (result): result is SearchResult =>
          result !== undefined &&
          /^https?:\/\//.test(result.url),
      );
  }

  private extractTag(
    xml: string,
    tag: string,
  ): string | undefined {
    const match = xml.match(
      new RegExp(
        `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        "i",
      ),
    );

    return match?.[1]?.trim();
  }

  private decodeXml(value: string): string {
    return value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

export const googleNewsProvider =
  new GoogleNewsProvider();
