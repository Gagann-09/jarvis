import { describe, expect, it } from "vitest";
import {
  GdeltResponseSchema,
} from "../../src/providers/news/gdelt.schema.js";

describe("GDELT response schema", () => {
  it("validates an article response", () => {
    const result = GdeltResponseSchema.parse({
      articles: [
        {
          url: "https://example.com/article",
          title: "AI development in India",
          seendate: "20260821120000",
          domain: "example.com",
          language: "English",
        },
      ],
    });

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.title).toBe(
      "AI development in India",
    );
  });

  it("accepts an empty article response", () => {
    const result = GdeltResponseSchema.parse({});

    expect(result.articles).toHaveLength(0);
  });
});