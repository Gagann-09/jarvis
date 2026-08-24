import { z } from "zod";
import type {
  Tool,
  ToolCapability,
  ToolExecutionContext,
  ToolResult,
} from "../types/tool.js";

export const createToolCapability = <TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
): ToolCapability<TInput, TOutput> => ({
  definition: tool.definition,

  async execute(
    input: TInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<TOutput>> {
    const parsedInput = inputSchema.safeParse(input);

    if (!parsedInput.success) {
      return {
        success: false,
        error: "Tool input validation failed.",
        confidence: {
          score: 0,
          reason: "Tool input did not satisfy its schema.",
        },
      };
    }

    if (context.permission !== tool.definition.permission) {
      return {
        success: false,
        error: "Tool permission mismatch.",
        confidence: {
          score: 0,
          reason:
            "Execution permission does not match the tool requirement.",
        },
      };
    }

    const result = await tool.execute(parsedInput.data, context);

    if (!result.success || result.data === undefined) {
      return result;
    }

    const parsedOutput = outputSchema.safeParse(result.data);

    if (!parsedOutput.success) {
      return {
        success: false,
        error: "Tool output validation failed.",
        ...(result.source !== undefined && {
          source: result.source,
        }),
        ...(result.freshness !== undefined && {
          freshness: result.freshness,
        }),
        confidence: {
          score: 0,
          reason:
            "Tool output did not satisfy its declared schema.",
        },
      };
    }

    return {
      ...result,
      data: parsedOutput.data,
    };
  },
});