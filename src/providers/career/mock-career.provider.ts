import type { Provider, ProviderResult } from "../../types/provider.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "../../tools/web/career.schema.js";

export const mockCareerProvider: Provider<
  CareerSearchInput,
  readonly CareerOpportunity[]
> = {
  name: "mock-career-provider",

  async fetch(
    input: CareerSearchInput,
  ): Promise<ProviderResult<readonly CareerOpportunity[]>> {
    const opportunity: CareerOpportunity = {
      title: `Career opportunity for ${input.query}`,
      organization: "Mock Organization",
      ...(input.location !== undefined && {
        location: input.location,
      }),
      url: "https://example.com/careers/mock",
      description: "Deterministic mock career provider result.",
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
    };
  },
};