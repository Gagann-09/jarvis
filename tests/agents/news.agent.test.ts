import { describe, expect, it } from "vitest";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";

describe("NewsAgent contract", () => {
  it("executes through a validated search capability", async () => {
    const context = new AgentContextService({
      requestId: "news-test-001",
      permission: "read",
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI internships Bangalore",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.results).toHaveLength(1);
    expect(result.data?.results[0]?.title).toContain(
      "AI internships Bangalore",
    );
    expect(result.decision.status).toBe("accept");
    expect(result.decision.confidence.score).toBe(1);
  });
});