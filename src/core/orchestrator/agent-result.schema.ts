import { z } from "zod";
import { DecisionStatus } from "../../types/decision.js";

const SourceMetadataSchema = z.object({
  source: z.string(),
  url: z.string().optional(),
  retrievedAt: z.string(),
}).passthrough();

const FreshnessMetadataSchema = z.object({
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  ageMinutes: z.number().optional(),
  score: z.number().optional(),
}).passthrough();

const ConfidenceMetadataSchema = z.object({
  score: z.number().min(0).max(1),
  reason: z.string().optional(),
}).passthrough();

const ProvenanceMetadataSchema = z.object({
  sources: z.array(SourceMetadataSchema),
  sourceCount: z.number(),
}).passthrough();

const DecisionSchema = z.object({
  status: z.enum([
    DecisionStatus.ACCEPT,
    DecisionStatus.REVIEW,
    DecisionStatus.REJECT,
  ]),
  confidence: ConfidenceMetadataSchema,
  reason: z.string(),
}).passthrough();

export const AgentResultSchema = z
  .object({
    success: z.boolean(),
    data: z.unknown().optional(),
    decision: DecisionSchema,
    error: z.string().optional(),
    source: SourceMetadataSchema.optional(),
    provenance: ProvenanceMetadataSchema.optional(),
    freshness: FreshnessMetadataSchema.optional(),
  }).passthrough()
  .refine(
    (res) => {
      if (res.success) {
        return res.data !== undefined && res.error === undefined;
      } else {
        return res.data === undefined && res.error !== undefined;
      }
    },
    {
      message:
        "AgentResult invariants violated: success requires data and no error; failure requires error and no data.",
    },
  );
