import { describe, expect, it } from "vitest";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";
import { mockNewsProvider } from "../../src/providers/news/mock-news.provider.js";

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
    expect(result.source?.source).toBe("mock-news-provider");
    expect(result.source?.url).toBe(
      "https://example.com/news/mock",
    );
    expect(result.source?.retrievedAt).toBeDefined();
  
  });
});