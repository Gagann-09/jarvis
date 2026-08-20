import { describe, expect, it } from "vitest";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";
import { OrchestratorService } from "../../src/core/orchestrator/orchestrator.service.js";

describe("Orchestrator contract", () => {
  it("registers and executes a NewsAgent", async () => {
    const orchestrator = new OrchestratorService();

    orchestrator.registerAgent(new NewsAgent());

    const context = new AgentContextService({
      requestId: "orchestrator-test-001",
      permission: "read",
      capabilities: {
        search: searchCapability,
      },
    });

    const result = await orchestrator.execute(
      {
        agentName: "news",
        input: {
          topic: "AI internships Bangalore",
        },
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.agentName).toBe("news");
  });

  it("returns a controlled result for an unknown agent", async () => {
    const orchestrator = new OrchestratorService();

    const context = new AgentContextService({
      requestId: "orchestrator-test-002",
      permission: "read",
      capabilities: {
        search: searchCapability,
      },
    });

    const result = await orchestrator.execute(
      {
        agentName: "unknown",
        input: {},
      },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Agent not found.");
  });
});