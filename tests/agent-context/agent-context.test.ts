import { describe, expect, it } from "vitest";
import type { AgentContext } from "../../src/types/agent-context.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";

describe("AgentContext contract", () => {
  it("provides tools, permissions, request identity, and memory", () => {
    const context: AgentContext = {
      requestId: "request-001",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
      relevantMemory: [],
    };

    expect(context.requestId).toBe("request-001");
    expect(context.permission).toBe("read");
    expect(context.capabilities.search).toBe(searchCapability);
    expect(context.capabilities.career).toBe(careerCapability);
    expect(context.capabilities.events).toBe(eventsCapability);
    expect(context.relevantMemory).toHaveLength(0);
  });

  it("preserves injected relevant memory", () => {
    const memoryRecord = {
      id: "memory-001",
      content: "User prefers AI/ML opportunities in Bengaluru.",
      createdAt: "2026-08-26T07:00:00.000Z",
      updatedAt: "2026-08-26T07:00:00.000Z",
      tags: ["career", "ai", "ml"],
    };

    const context: AgentContext = {
      requestId: "request-002",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
      relevantMemory: [memoryRecord],
    };

    expect(context.relevantMemory).toHaveLength(1);
    expect(context.relevantMemory[0]).toEqual(memoryRecord);
  });
});