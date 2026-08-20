import { describe, expect, it } from "vitest";
import type { AgentContext } from "../../src/types/agent-context.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";

describe("AgentContext contract", () => {
  it("provides tools, permissions, request identity, and memory", () => {
    const context: AgentContext = {
      requestId: "request-001",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
      },
      relevantMemory: [],
    };

    expect(context.requestId).toBe("request-001");
    expect(context.permission).toBe("read");
    expect(context.capabilities.search).toBe(searchCapability);
    expect(context.capabilities.career).toBe(careerCapability);
    expect(context.relevantMemory).toHaveLength(0);
  });
});