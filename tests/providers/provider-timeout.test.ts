import { describe, expect, it } from "vitest";
import { GdeltNewsProvider } from "../../src/providers/news/gdelt.provider.js";
import { GoogleNewsProvider } from "../../src/providers/news/google-news.provider.js";
import type { HttpClient } from "../../src/providers/http/http-client.js";

const FIXED_TIME = "2026-08-22T12:00:00.000Z";

/**
 * Simulates a timeout error matching what FetchHttpClient throws
 * when AbortSignal.timeout() fires.
 */
const timeoutHttpClient = (url: string): HttpClient => ({
  async get<TResponse>(_url: string): Promise<TResponse> {
    throw new Error(
      `Request to ${url} timed out after 10000ms.`,
    );
  },

  async getText(_url: string): Promise<string> {
    throw new Error(
      `Request to ${url} timed out after 10000ms.`,
    );
  },
});

describe("Provider timeout handling", () => {
  it("GDELT preserves source metadata on timeout", async () => {
    const client = timeoutHttpClient(
      "https://api.gdeltproject.org/api/v2/doc/doc",
    );
    const provider = new GdeltNewsProvider(client);

    const result = await provider.fetch({
      query: "AI timeout test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("timed out");
    expect(result.source).toBeDefined();
    expect(result.source?.source).toBe(
      "gdelt-news-provider",
    );
    expect(result.data).toBeUndefined();
  });

  it("Google News preserves source metadata on timeout", async () => {
    const client = timeoutHttpClient(
      "https://news.google.com/rss/search",
    );
    const provider = new GoogleNewsProvider(client);

    const result = await provider.fetch({
      query: "AI timeout test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("timed out");
    expect(result.source).toBeDefined();
    expect(result.source?.source).toBe(
      "google-news-provider",
    );
    expect(result.data).toBeUndefined();
  });

  it("GDELT timeout error message is descriptive", async () => {
    const client = timeoutHttpClient(
      "https://api.gdeltproject.org/api/v2/doc/doc",
    );
    const provider = new GdeltNewsProvider(client);

    const result = await provider.fetch({
      query: "AI timeout message",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out after \d+ms/);
  });

  it("Google News timeout error message is descriptive", async () => {
    const client = timeoutHttpClient(
      "https://news.google.com/rss/search",
    );
    const provider = new GoogleNewsProvider(client);

    const result = await provider.fetch({
      query: "AI timeout message",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out after \d+ms/);
  });

  it("GDELT timeout does not affect other HttpClient injections", () => {
    // GdeltNewsProvider accepts injectable HttpClient for tests
    const mockClient: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {
          articles: [],
        } as TResponse;
      },
      async getText(_url: string): Promise<string> {
        return "";
      },
    };

    const provider = new GdeltNewsProvider(mockClient);

    expect(provider.name).toBe("gdelt-news-provider");
  });

  it("Google News timeout does not affect other HttpClient injections", () => {
    const mockClient: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {} as TResponse;
      },
      async getText(_url: string): Promise<string> {
        return "<rss></rss>";
      },
    };

    const provider = new GoogleNewsProvider(mockClient);

    expect(provider.name).toBe("google-news-provider");
  });
});
