import { describe, expect, it } from "vitest";
import { EventsAgent } from "../../src/agents/events/events.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";

describe("EventsAgent contract", () => {
  it("executes through the validated events capability", async () => {
    const context = new AgentContextService({
      requestId: "events-agent-test-001",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
    });

    const agent = new EventsAgent();

    const result = await agent.execute(
      {
        query: "AI ML CSE events",
        location: "Bangalore",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.events).toHaveLength(1);

    expect(result.data?.events[0]?.title).toContain(
      "AI ML CSE events",
    );

    expect(result.data?.events[0]?.organizer).toBe(
      "Mock Events Organization",
    );

    expect(result.data?.events[0]?.source).toBe(
      "mock-events-source",
    );

    expect(result.decision.status).toBe("accept");
    expect(result.decision.confidence.score).toBe(1);
  });

  it("translates capability permission failures into controlled AgentResult failures", async () => {
    const context = new AgentContextService({
      requestId: "events-agent-test-002",
      permission: "execute",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
    });

    const agent = new EventsAgent();

    const result = await agent.execute(
      {
        query: "AI ML CSE events",
        location: "Bangalore",
      },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
    expect(result.decision?.status).toBe("review");
  });
});