import { describe, expect, it } from "vitest";
import { mockNewsProvider } from "../../src/providers/news/mock-news.provider.js";

describe("News provider", () => {
  it("returns canonical news search results", async () => {
    const result = await mockNewsProvider.fetch({
      query: "AI news",
    });

    expect(mockNewsProvider.name).toBe("mock-news-provider");
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.title).toContain("AI news");
    expect(result.source?.source).toBe("mock-news-provider");
  });
});