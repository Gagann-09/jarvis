import { describe, expect, it } from "vitest";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";
import type {
  SearchResult,
} from "../../src/tools/web/search.schema.js";

describe("NewsAgent contract", () => {
  it("executes through a validated search capability", async () => {
    const searchCapability = createSearchCapability({
      name: "test-news-provider",
      async fetch() {
        return {
          success: true,
          data: [
            {
              title: "AI ML news",
              url: "https://example.com/news",
              snippet: "Test news result.",
            },
          ],
        };
      },
    });

    const context = new AgentContextService({
      requestId: "news-test-001",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI ML news",
      },
      context,
    );

    expect(result.decision.status).toBe("accept");
    expect(result.decision.confidence.score).toBe(1);
    expect(result.data?.results).toHaveLength(1);
    expect(result.data?.results[0]?.title).toBeDefined();
  });

  it("deduplicates results by URL while preserving order", async () => {
    const results: readonly SearchResult[] = [
      {
        title: "First result",
        url: "https://example.com/first",
        snippet: "First",
      },
      {
        title: "Duplicate first result",
        url: "https://example.com/first",
        snippet: "Duplicate",
      },
      {
        title: "Second result",
        url: "https://example.com/second",
        snippet: "Second",
      },
    ];

    const searchCapability = createSearchCapability({
      name: "test-news-provider",
      async fetch() {
        return {
          success: true,
          data: results,
        };
      },
    });

    const context = new AgentContextService({
      requestId: "news-test-002",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI ML news",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.results).toHaveLength(2);
    expect(result.data?.results[0]?.title).toBe("First result");
    expect(result.data?.results[1]?.title).toBe("Second result");
  });
});