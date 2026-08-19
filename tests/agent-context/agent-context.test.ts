import { describe, expect, it } from "vitest";
import type { AgentContext } from "../../src/types/agent-context.js";
import { MockSearchTool } from "../../src/tools/web/mock-search.tool.js";

describe("AgentContext contract", () => {
  it("provides tools, permissions, request identity, and memory", () => {
    const context: AgentContext = {
      requestId: "request-001",
      permission: "read",
      tools: [new MockSearchTool()],
      relevantMemory: [],
    };

    expect(context.requestId).toBe("request-001");
    expect(context.permission).toBe("read");
    expect(context.tools).toHaveLength(1);
    expect(context.relevantMemory).toHaveLength(0);
  });
});