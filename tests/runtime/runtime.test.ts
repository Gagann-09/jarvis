import { describe, expect, it } from "vitest";
import type { ToolCapability } from "../../src/types/tool.js";
import type {
  SearchInput,
  SearchResult,
} from "../../src/tools/web/search.schema.js";
import { createRuntime } from "../../src/core/runtime/runtime.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";

const mockSearchCapability: ToolCapability<
  SearchInput,
  readonly SearchResult[]
> = {
  definition: {
    name: "search",
    description: "Test search capability.",
    permission: "read",
  },

  async execute() {
    return {
      success: true,
      data: [
        {
          title: "Mock news",
          url: "https://example.com/news",
          snippet: "Mock news result.",
        },
      ],
      source: {
        source: "mock-news-provider",
        retrievedAt: new Date().toISOString(),
      },
      confidence: {
        score: 1,
        reason: "Deterministic test result.",
      },
    };
  },
};

describe("Runtime composition", () => {
  it("registers all three read-only agents", async () => {
    const runtime = createRuntime();

    const context = new AgentContextService({
      requestId: "runtime-test-001",
      permission: "read",
      capabilities: {
        search: mockSearchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
    });

    const news = await runtime.orchestrator.execute(
      {
        agentName: "news",
        input: {
          topic: "AI ML news",
        },
      },
      context,
    );

    const career = await runtime.orchestrator.execute(
      {
        agentName: "career",
        input: {
          query: "AI ML internship",
          location: "Bangalore",
          remote: false,
        },
      },
      context,
    );

    const events = await runtime.orchestrator.execute(
      {
        agentName: "events",
        input: {
          query: "AI ML CSE events",
          location: "Bangalore",
        },
      },
      context,
    );

    expect(news.agentName).toBe("news");
    expect(career.agentName).toBe("career");
    expect(events.agentName).toBe("events");

    expect(news.success).toBe(true);
    expect(career.success).toBe(true);
    expect(events.success).toBe(true);
  });

  it("creates read-only contexts by default", () => {
    const runtime = createRuntime();

    const context = runtime.createContext("runtime-test-002");

    expect(context.requestId).toBe("runtime-test-002");
    expect(context.permission).toBe("read");
    expect(context.relevantMemory).toEqual([]);
    expect(context.capabilities.search).toBeDefined();
    expect(context.capabilities.career).toBeDefined();
    expect(context.capabilities.events).toBeDefined();
  });
});