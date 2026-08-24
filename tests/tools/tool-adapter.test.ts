import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createToolCapability } from "../../src/tools/tool-adapter.js";
import type {
  Tool,
  ToolExecutionContext,
} from "../../src/types/tool.js";

const context: ToolExecutionContext = {
  requestId: "tool-adapter-test",
  permission: "read",
};

const definition = {
  name: "test-tool",
  description: "Deterministic test tool.",
  permission: "read" as const,
};

describe("createToolCapability", () => {
  it("preserves the tool definition", () => {
    const tool: Tool<{ query: string }, readonly string[]> = {
      definition,

      async execute() {
        return {
          success: true,
          data: ["result"],
        };
      },
    };

    const capability = createToolCapability(
      tool,
      z.object({
        query: z.string(),
      }),
      z.array(z.string()),
    );

    expect(capability.definition).toEqual(definition);
  });

  it("rejects invalid input before tool execution", async () => {
    let executed = false;

    const tool: Tool<{ query: string }, readonly string[]> = {
      definition,

      async execute() {
        executed = true;

        return {
          success: true,
          data: ["result"],
        };
      },
    };

    const capability = createToolCapability(
      tool,
      z.object({
        query: z.string().min(1),
      }),
      z.array(z.string()),
    );

    const result = await capability.execute(
      { query: "" },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Tool input validation failed.",
    );
    expect(result.confidence?.score).toBe(0);
    expect(executed).toBe(false);
  });

  it("rejects permission mismatch before tool execution", async () => {
    let executed = false;

    const tool: Tool<undefined, readonly string[]> = {
      definition,

      async execute() {
        executed = true;

        return {
          success: true,
          data: ["result"],
        };
      },
    };

    const capability = createToolCapability(
      tool,
      z.undefined(),
      z.array(z.string()),
    );

    const result = await capability.execute(undefined, {
      requestId: "permission-test",
      permission: "execute",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Tool permission mismatch.",
    );
    expect(result.confidence?.score).toBe(0);
    expect(executed).toBe(false);
  });

  it("returns the tool failure unchanged", async () => {
    const tool: Tool<undefined, readonly string[]> = {
      definition,

      async execute() {
        return {
          success: false,
          error: "Underlying tool failed.",
        };
      },
    };

    const capability = createToolCapability(
      tool,
      z.undefined(),
      z.array(z.string()),
    );

    const result = await capability.execute(
      undefined,
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Underlying tool failed.",
    );
  });

  it("rejects invalid tool output", async () => {
    const tool: Tool<undefined, readonly string[]> = {
      definition,

      async execute() {
        return {
          success: true,
          data: [123] as unknown as readonly string[],
        };
      },
    };

    const capability = createToolCapability(
      tool,
      z.undefined(),
      z.array(z.string()),
    );

    const result = await capability.execute(
      undefined,
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Tool output validation failed.",
    );
    expect(result.confidence?.score).toBe(0);
  });

  it("preserves valid output and metadata", async () => {
    const tool: Tool<undefined, readonly string[]> = {
      definition,

      async execute() {
        return {
          success: true,
          data: ["validated"],
          source: {
            source: "test-source",
            url: "https://example.com",
            retrievedAt: "2026-08-24T00:00:00.000Z",
          },
          freshness: {
            ageMinutes: 5,
            score: 0.95,
          },
          confidence: {
            score: 0.8,
            reason: "Test confidence.",
          },
        };
      },
    };

    const capability = createToolCapability(
      tool,
      z.undefined(),
      z.array(z.string()),
    );

    const result = await capability.execute(
      undefined,
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(["validated"]);

    expect(result.source?.source).toBe(
      "test-source",
    );

    expect(result.freshness?.ageMinutes).toBe(5);

    expect(result.confidence?.score).toBe(0.8);
  });
});