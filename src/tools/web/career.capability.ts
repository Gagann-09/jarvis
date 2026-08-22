import type { ToolCapability } from "../../types/tool.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "./career.schema.js";
import { mockCareerProvider } from "../../providers/career/mock-career.provider.js";
import { adzunaCareerProvider } from "../../providers/career/adzuna-career.provider.js";
import { FallbackProvider } from "../../providers/fallback.provider.js";

const careerProvider = new FallbackProvider(
  adzunaCareerProvider,
  mockCareerProvider,
);

export const careerCapability: ToolCapability<
  CareerSearchInput,
  readonly CareerOpportunity[]
> = {
  definition: {
    name: "career_search",
    description: "Finds read-only career opportunities.",
    permission: "read",
  },

  async execute(input, context) {
    if (context.permission !== "read") {
      return {
        success: false,
        error: `Permission denied: Tool career_search requires read permission, but ${context.permission} was provided.`,
      };
    }

    const result = await careerProvider.fetch(input);

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