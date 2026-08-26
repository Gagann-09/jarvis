import { describe, expect, it } from "vitest";
import { EventsAgent } from "../../src/agents/events/events.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";
import type { ToolCapability } from "../../src/types/tool.js";
import type {
  Event,
  EventsSearchInput,
} from "../../src/tools/web/events.schema.js";

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

  it("allows execute context to use read capability through agent", async () => {
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

    expect(result.success).toBe(true);
    expect(result.data?.events).toHaveLength(1);
    expect(result.decision.status).toBe("accept");
  });

  it("requires review for successful low-confidence results", async () => {
    const lowConfidenceEventsCapability: ToolCapability<
      EventsSearchInput,
      readonly Event[]
    > = {
      definition: eventsCapability.definition,

      async execute() {
        return {
          success: true,
          data: [
            {
              title: "AI event",
              organizer: "Example Organizer",
              url: "https://example.com/event",
              description: "Low-confidence event result.",
              startsAt: "2026-09-15T10:00:00.000Z",
              source: "example-events-source",
            },
          ],
          confidence: {
            score: 0.49,
            reason: "Provider confidence below accept threshold.",
          },
        };
      },
    };

    const context = new AgentContextService({
      requestId: "events-agent-test-003",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: lowConfidenceEventsCapability,
      },
    });

    const agent = new EventsAgent();

    const result = await agent.execute(
      {
        query: "AI event",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.decision.status).toBe("review");
    expect(result.decision.confidence.score).toBe(0.49);
  });
});
