import type { ToolCapability } from "../../types/tool.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "./career.schema.js";
import { mockCareerProvider } from "../../providers/career/mock-career.provider.js";

export const careerCapability: ToolCapability<
  CareerSearchInput,
  readonly CareerOpportunity[]
> = {
  definition: {
    name: "career_search",
    description: "Finds read-only career opportunities.",
    permission: "read",
  },

  async execute(input, _context) {
    const result = await mockCareerProvider.fetch(input);

    if (!result.success || result.data === undefined) {
      return {
        success: false,
        error: result.error ?? "Career provider failed.",
        ...(result.source !== undefined && {
          source: result.source,
        }),
        ...(result.freshness !== undefined && {
          freshness: result.freshness,
        }),
      };
    }

    return {
      success: true,
      data: result.data,
      ...(result.source !== undefined && {
        source: result.source,
      }),
      ...(result.freshness !== undefined && {
        freshness: result.freshness,
      }),
      confidence: {
        score: 1,
        reason: "Validated deterministic career provider result.",
      },
    };
  },
};