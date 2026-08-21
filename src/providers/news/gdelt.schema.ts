import { z } from "zod";

export const GdeltArticleSchema = z.object({
  url: z.url(),
  title: z.string(),
  seendate: z.string(),
  domain: z.string(),
  language: z.string().optional(),
});

export const GdeltResponseSchema = z.object({
  articles: z.array(GdeltArticleSchema).default([]),
});

export type GdeltArticle = z.infer<typeof GdeltArticleSchema>;
export type GdeltResponse = z.infer<typeof GdeltResponseSchema>;