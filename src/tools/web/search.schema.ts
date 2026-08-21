import { z } from "zod";

export const SearchInputSchema = z.object({
  query: z.string().trim().min(1),
});

export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.url(),
  snippet: z.string(),
  publishedAt: z.string().datetime().optional(),
  freshness: z
    .object({
      publishedAt: z.string().datetime().optional(),
      updatedAt: z.string().datetime().optional(),
      expiresAt: z.string().datetime().optional(),
      ageMinutes: z.number().nonnegative().optional(),
      score: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const SearchResultsSchema =
  z.array(SearchResultSchema);

export type SearchInput =
  z.infer<typeof SearchInputSchema>;

export type SearchResult =
  z.infer<typeof SearchResultSchema>;