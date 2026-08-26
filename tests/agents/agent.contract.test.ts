import { describe, expect, it } from "vitest";
import type { Agent, AgentResult } from "../../src/types/agent.js";

describe("Agent contract", () => {
  it("requires a valid agent definition", () => {
    const agent: Agent<unknown, unknown> = {
      definition: {
        name: "test-agent",
        description: "Test agent.",
      },
      async execute() {
        return {
          success: true,
          data: { ok: true },
          decision: {
            status: "accept",
            confidence: {
              score: 1,
            },
            reason: "Test execution succeeded.",
          },
        };
      },
    };

    expect(agent.definition.name).toBe("test-agent");
    expect(agent.definition.description).toBe("Test agent.");
  });

  it("represents successful execution with data and decision", () => {
    const result: AgentResult<{ ok: boolean }> = {
      success: true,
      data: { ok: true },
      decision: {
        status: "accept",
        confidence: {
          score: 1,
        },
        reason: "Execution succeeded.",
      },
    };

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ok: true });
    expect(result.decision.status).toBe("accept");
  });

  it("represents controlled failure with error and review decision", () => {
    const result: AgentResult<unknown> = {
      success: false,
      decision: {
        status: "review",
        confidence: {
          score: 0,
        },
        reason: "Execution requires review.",
      },
      error: "Execution failed.",
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe("Execution failed.");
    expect(result.decision.status).toBe("review");
  });

  it("preserves optional metadata on the result", () => {
    const result: AgentResult<{ ok: boolean }> = {
      success: true,
      data: { ok: true },
      decision: {
        status: "accept",
        confidence: {
          score: 1,
        },
        reason: "Execution succeeded.",
      },
      source: {
        source: "test-provider",
        retrievedAt: "2026-08-22T12:00:00.000Z",
      },
      freshness: {
        publishedAt: "2026-08-22T12:00:00.000Z",
        score: 1,
      },
      provenance: {
        sources: [
          {
            source: "test-provider",
            retrievedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
        sourceCount: 1,
      },
    };

    expect(result.source?.source).toBe("test-provider");
    expect(result.freshness?.score).toBe(1);
    expect(result.provenance?.sourceCount).toBe(1);
  });
});