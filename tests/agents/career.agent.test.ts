import { describe, expect, it } from "vitest";
import { CareerAgent } from "../../src/agents/career/career.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";

describe("CareerAgent contract", () => {
  it("executes through the validated career capability", async () => {
    const context = new AgentContextService({
      requestId: "career-agent-test-001",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
      },
    });

    const agent = new CareerAgent();

    const result = await agent.execute(
      {
        query: "AI ML internship",
        location: "Bangalore",
        remote: false,
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.opportunities).toHaveLength(1);

    expect(result.data?.opportunities[0]?.title).toContain(
      "AI ML internship",
    );

    expect(result.data?.opportunities[0]?.organization).toBe(
      "Mock Organization",
    );

    expect(result.data?.opportunities[0]?.source).toBe(
      "mock-career-source",
    );

    expect(result.decision.status).toBe("accept");
    expect(result.decision.confidence.score).toBe(1);
  });

  it("translates capability permission failures into controlled AgentResult failures", async () => {
    const context = new AgentContextService({
      requestId: "career-agent-test-002",
      permission: "execute",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
      },
    });

    const agent = new CareerAgent();

    const result = await agent.execute(
      {
        query: "AI ML internship",
        location: "Bangalore",
        remote: false,
      },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
    expect(result.decision?.status).toBe("review");
  });
});