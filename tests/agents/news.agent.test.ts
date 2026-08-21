import { describe, expect, it } from "vitest";
import type { Provider } from "../../src/types/provider.js";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";
import { mockNewsProvider } from "../../src/providers/news/mock-news.provider.js";
import type {
  SearchInput,
  SearchResult,
} from "../../src/tools/web/search.schema.js";

describe("NewsAgent contract", () => {
  it("executes through a validated search capability", async () => {
    const searchCapability = createSearchCapability(
      mockNewsProvider,
    );

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
    const duplicateProvider: Provider<
      SearchInput,
      readonly SearchResult[]
    > = {
      name: "duplicate-news-provider",

      async fetch() {
        return {
          success: true,
          data: [
            {
              title: "First result",
              url: "https://example.com/story",
              snippet: "First",
            },
            {
              title: "Duplicate result",
              url: "https://example.com/story",
              snippet: "Duplicate",
            },
            {
              title: "Second result",
              url: "https://example.com/second",
              snippet: "Second",
            },
          ],
        };
      },
    };

    const context = new AgentContextService({
      requestId: "news-dedupe-001",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: createSearchCapability(duplicateProvider),
      },
    });

    const result = await new NewsAgent().execute(
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
