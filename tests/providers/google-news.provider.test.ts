import { describe, expect, it } from "vitest";
import { GoogleNewsProvider } from "../../src/providers/news/google-news.provider.js";
import type { HttpClient } from "../../src/providers/http/http-client.js";

describe("Google News provider", () => {
  it("maps RSS items into canonical search results", async () => {
    const httpClient: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {} as TResponse;
      },

      async getText(_url: string): Promise<string> {
        return `
          <rss>
            <channel>
              <item>
                <title>AI development in India</title>
                <link>https://example.com/ai</link>
                <description>Latest AI developments in India.</description>
              </item>
            </channel>
          </rss>
        `;
      },
    };

    const provider = new GoogleNewsProvider(httpClient);

    const result = await provider.fetch({
      query: "AI India",
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.title).toBe(
      "AI development in India",
    );
    expect(result.data?.[0]?.url).toBe(
      "https://example.com/ai",
    );
    expect(result.data?.[0]?.snippet).toBe(
      "Latest AI developments in India.",
    );
    expect(result.source?.source).toBe(
      "google-news-provider",
    );
  });

  it("handles RSS items with CDATA and XML entities", async () => {
    const httpClient: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {} as TResponse;
      },

      async getText(_url: string): Promise<string> {
        return `
          <rss>
            <channel>
              <item>
                <title><![CDATA[AI &amp; India]]></title>
                <link><![CDATA[https://example.com/news]]></link>
                <description>
                  <![CDATA[AI &amp; ML developments &lt;today&gt;]]>
                </description>
              </item>
            </channel>
          </rss>
        `;
      },
    };

    const provider = new GoogleNewsProvider(httpClient);

    const result = await provider.fetch({
      query: "AI India",
    });

    expect(result.success).toBe(true);
    expect(result.data?.[0]?.title).toBe("AI & India");
    expect(result.data?.[0]?.url).toBe(
      "https://example.com/news",
    );
    expect(result.data?.[0]?.snippet).toBe(
      "AI & ML developments <today>",
    );
  });

  it("returns controlled failure when the RSS request fails", async () => {
    const httpClient: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {} as TResponse;
      },

      async getText(_url: string): Promise<string> {
        throw new Error("Google News unavailable.");
      },
    };

    const provider = new GoogleNewsProvider(httpClient);

    const result = await provider.fetch({
      query: "AI India",
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe(
      "Google News unavailable.",
    );
    expect(result.source?.source).toBe(
      "google-news-provider",
    );
  });
});