import { z } from "zod";

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

export const MemoryRecordSchema = z.object({
  id: z.string().trim().min(1, "MemoryRecord.id must be a non-empty string."),
  content: z.string().trim().min(1, "MemoryRecord.content must be a non-empty string."),
  createdAt: z.string().datetime({ message: "MemoryRecord.createdAt must be a valid ISO timestamp." }),
  updatedAt: z.string().datetime({ message: "MemoryRecord.updatedAt must be a valid ISO timestamp." }),
  tags: z.array(z.string()),
  source: SourceMetadataSchema.optional(),
  freshness: FreshnessMetadataSchema.optional(),
  confidence: ConfidenceMetadataSchema.optional(),
}).passthrough();

export const MemoryQuerySchema = z.object({
  text: z.string().optional(),
  tags: z.array(z.string()).readonly().optional(),
  limit: z.number().int().min(1, "MemoryQuery.limit must be >= 1.").optional(),
}).passthrough();
