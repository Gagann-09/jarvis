import { describe, expect, it } from "vitest";
import { GdeltNewsProvider } from "../../src/providers/news/gdelt.provider.js";

describe("GDELT live smoke test", () => {
  it("handles the live GDELT response safely", async () => {
    const provider = new GdeltNewsProvider();

    const result = await provider.fetch({
      query: "AI India",
    });

    expect(result.source?.source).toBe("gdelt-news-provider");

    if (result.success) {
      expect(result.data).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
    }
  }, 15000);
});