import { z } from "zod";

export const CareerSearchInputSchema = z.object({
  query: z.string().trim().min(1),
  location: z.string().trim().min(1).optional(),
  remote: z.boolean().optional(),
});

export const CareerOpportunitySchema = z.object({
  title: z.string().trim().min(1),
  organization: z.string().trim().min(1),
  location: z.string().trim().min(1).optional(),
  url: z.url(),
  description: z.string(),
  source: z.string().trim().min(1),
  publishedAt: z.string().datetime().optional(),
});

export const CareerOpportunitiesSchema = z.array(
  CareerOpportunitySchema,
);

export type CareerSearchInput = z.infer<
  typeof CareerSearchInputSchema
>;

export type CareerOpportunity = z.infer<
  typeof CareerOpportunitySchema
>;