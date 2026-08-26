import { describe, expect, it } from "vitest";
import type { ToolCapability } from "../../src/types/tool.js";
import type {
  SearchInput,
  SearchResult,
} from "../../src/tools/web/search.schema.js";
import type { Runtime } from "../../src/types/runtime.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";
import { createRuntime } from "../../src/core/runtime/runtime.js";

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

describe("Runtime contract", () => {
  it("creates an object satisfying the Runtime contract", () => {
    const runtime: Runtime = createRuntime();

    expect(runtime.orchestrator).toBeDefined();
    expect(runtime.createContext).toBeTypeOf("function");
  });

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

  it("creates contexts with the requested permission", () => {
    const runtime = createRuntime();

    const context = runtime.createContext(
      "runtime-test-003",
      "read",
    );

    expect(context.permission).toBe("read");
  });

  it("creates independent contexts for separate requests", () => {
    const runtime = createRuntime();

    const first = runtime.createContext("runtime-test-004");
    const second = runtime.createContext("runtime-test-005");

    expect(first.requestId).toBe("runtime-test-004");
    expect(second.requestId).toBe("runtime-test-005");

    expect(first).not.toBe(second);
  });

  it("exposes the expected read-only capabilities", () => {
    const runtime = createRuntime();

    const context = runtime.createContext("runtime-test-006");

    expect(context.capabilities).toEqual({
      search: expect.anything(),
      career: expect.anything(),
      events: expect.anything(),
    });
  });
});
