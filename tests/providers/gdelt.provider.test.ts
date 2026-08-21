import { describe, expect, it } from "vitest";
import { GdeltNewsProvider } from "../../src/providers/news/gdelt.provider.js";
import type { HttpClient } from "../../src/providers/http/http-client.js";

describe("GDELT News provider", () => {
  it("maps GDELT articles into canonical search results", async () => {
    const httpClient: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {
          articles: [
            {
              url: "https://example.com/ai",
              title: "AI development in India",
              seendate: "20260821120000",
              domain: "example.com",
              language: "English",
            },
          ],
        } as TResponse;
      },

      async getText(_url: string): Promise<string> {
        return "";
      },
    };

    const provider = new GdeltNewsProvider(httpClient);

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
    expect(result.data?.[0]?.publishedAt).toBe(
      "2026-08-21T12:00:00.000Z",
    );
    expect(result.source?.source).toBe(
      "gdelt-news-provider",
    );
  });

  it("returns controlled failure for malformed GDELT data", async () => {
    const httpClient: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {
          articles: [
            {
              url: "not-a-url",
              title: 123,
              seendate: "invalid",
              domain: "example.com",
            },
          ],
        } as TResponse;
      },

      async getText(_url: string): Promise<string> {
        return "";
      },
    };

    const provider = new GdeltNewsProvider(httpClient);

    const result = await provider.fetch({
      query: "AI India",
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe(
      "GDELT returned an invalid response.",
    );
  });
});