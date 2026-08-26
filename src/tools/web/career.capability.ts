import type { ToolCapability } from "../../types/tool.js";
import { hasPermission } from "../../types/permissions.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "./career.schema.js";
import { CareerOpportunitiesSchema } from "./career.schema.js";
import { mockCareerProvider } from "../../providers/career/mock-career.provider.js";
import { adzunaCareerProvider } from "../../providers/career/adzuna-career.provider.js";
import { FallbackProvider } from "../../providers/fallback.provider.js";
import { careerFreshnessService } from "../../services/career/career-freshness.service.js";
import { normalizeConfidence } from "../../types/decision.js";

const careerProvider = new FallbackProvider(
  adzunaCareerProvider,
  mockCareerProvider,
);

export function validateCareerResult(result: {
  data: unknown;
  source?: any;
  provenance?: any;
  freshness?: any;
  confidence?: any;
}): any {
  let validatedData: readonly CareerOpportunity[];

  try {
    validatedData = CareerOpportunitiesSchema.parse(result.data);
  } catch {
    return {
      success: false,
      error: "Career provider returned invalid opportunity data.",
      ...(result.source !== undefined && {
        source: result.source,
      }),
      ...(result.provenance !== undefined && {
        provenance: result.provenance,
      }),
      ...(result.freshness !== undefined && {
        freshness: result.freshness,
      }),
    };
  }

  let newestDate: string | undefined;
  let maxTime = -Infinity;

  for (const item of validatedData) {
    if (item.publishedAt) {
      const time = new Date(item.publishedAt).getTime();
      if (!Number.isNaN(time) && time > maxTime) {
        maxTime = time;
        newestDate = item.publishedAt;
      }
    }
  }

  const freshness = careerFreshnessService.calculate(newestDate);

  const providerConfidence = result.confidence?.score ?? 1;

  const freshnessMultiplier =
    freshness.publishedAt === undefined
      ? 1
      : 0.5 + (freshness.score ?? 0) * 0.5;

  const confidence = normalizeConfidence(
    {
      score: providerConfidence * freshnessMultiplier,
      reason:
        `Career provider confidence (${providerConfidence}) ` +
        `and freshness (${freshness.score ?? 0}) ` +
        "were combined.",
    },
    "Career confidence could not be calculated.",
  );

  return {
    success: true,
    data: validatedData,
    ...(result.source !== undefined && {
      source: result.source,
    }),
    ...(result.provenance !== undefined && {
      provenance: result.provenance,
    }),
    freshness,
    confidence,
  };
}

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
    if (!hasPermission(context.permission, "read")) {
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
        ...(result.provenance !== undefined && {
          provenance: result.provenance,
        }),
        ...(result.freshness !== undefined && {
          freshness: result.freshness,
        }),
      };
    }

    return validateCareerResult(result);
  },
};