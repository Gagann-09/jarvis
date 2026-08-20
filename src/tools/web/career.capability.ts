import type { ToolCapability } from "../../types/tool.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "./career.schema.js";

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
    const opportunity: CareerOpportunity = {
      title: `AI/ML opportunity for ${input.query}`,
      organization: "Mock Organization",
      ...(input.location !== undefined && {
        location: input.location,
      }),
      url: "https://example.com/careers/mock",
      description: "Deterministic career opportunity for contract testing.",
      source: "mock-career-source",
      publishedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: [opportunity],
      source: {
        source: "mock-career-source",
        url: opportunity.url,
        retrievedAt: new Date().toISOString(),
      },
      confidence: {
        score: 1,
        reason: "Deterministic mock career data.",
      },
    };
  },
};