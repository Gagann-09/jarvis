import { describe, expect, it } from "vitest";
import { CareerAgent } from "../../src/agents/career/career.agent.js";
import { EventsAgent } from "../../src/agents/events/events.agent.js";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { OrchestratorService } from "../../src/core/orchestrator/orchestrator.service.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";
import { mockNewsProvider } from "../../src/providers/news/mock-news.provider.js";
import type { Agent } from "../../src/types/agent.js";

const createContext = (requestId: string) =>
  new AgentContextService({
    requestId,
    permission: "read",
    capabilities: {
      search: createSearchCapability(mockNewsProvider),
      career: careerCapability,
      events: eventsCapability,
    },
  });

describe("Orchestrator contract", () => {
  it("registers and executes a NewsAgent", async () => {
    const orchestrator = new OrchestratorService();

    orchestrator.registerAgent(new NewsAgent());

    const result = await orchestrator.execute(
      {
        agentName: "news",
        input: {
          topic: "AI internships Bangalore",
        },
      },
      createContext("orchestrator-news-001"),
    );

    expect(result.success).toBe(true);
    expect(result.agentName).toBe("news");
  });

  it("registers and executes a CareerAgent", async () => {
    const orchestrator = new OrchestratorService();

    orchestrator.registerAgent(new CareerAgent());

    const result = await orchestrator.execute(
      {
        agentName: "career",
        input: {
          query: "AI ML internship",
          location: "Bangalore",
          remote: false,
        },
      },
      createContext("orchestrator-career-001"),
    );

    expect(result.success).toBe(true);
    expect(result.agentName).toBe("career");
  });

  it("registers and executes an EventsAgent", async () => {
    const orchestrator = new OrchestratorService();

    orchestrator.registerAgent(new EventsAgent());

    const result = await orchestrator.execute(
      {
        agentName: "events",
        input: {
          query: "AI ML CSE events",
          location: "Bangalore",
        },
      },
      createContext("orchestrator-events-001"),
    );

    expect(result.success).toBe(true);
    expect(result.agentName).toBe("events");
  });

  it("returns a controlled result for an unknown agent", async () => {
    const orchestrator = new OrchestratorService();

    const result = await orchestrator.execute(
      {
        agentName: "unknown",
        input: {},
      },
      createContext("orchestrator-unknown-001"),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Agent not found.");
  });

  it("returns a controlled result when an agent throws an exception", async () => {
    const orchestrator = new OrchestratorService();

    const throwingAgent: Agent<unknown, unknown> = {
      definition: { name: "throwing", description: "Throws an error" },
      execute: async () => {
        throw new Error("Unexpected error");
      },
    };

    orchestrator.registerAgent(throwingAgent);

    const result = await orchestrator.execute(
      {
        agentName: "throwing",
        input: {},
      },
      createContext("orchestrator-throwing-001"),
    );

    expect(result.success).toBe(false);
    expect(result.agentName).toBe("throwing");
    expect(result.result).toBeNull();
    expect(result.error).toBe("Agent execution failed.");
  });
});