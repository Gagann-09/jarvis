import { describe, expect, it } from "vitest";
import type { Provider } from "../../src/types/provider.js";
import type {
  SearchInput,
  SearchResult,
} from "../../src/tools/web/search.schema.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";

describe("Search capability fallback", () => {
  it("falls back when the primary provider fails", async () => {
    const primaryProvider: Provider<
      SearchInput,
      readonly SearchResult[]
    > = {
      name: "failing-primary",
      async fetch() {
        return {
          success: false,
          error: "Primary provider unavailable.",
        };
      },
    };

    const fallbackProvider: Provider<
      SearchInput,
      readonly SearchResult[]
    > = {
      name: "test-fallback",
      async fetch(input) {
        return {
          success: true,
          data: [
            {
              title: `Fallback result for ${input.query}`,
              url: "https://example.com/fallback",
              snippet: "Fallback provider result.",
            },
          ],
          source: {
            source: "test-fallback",
            url: "https://example.com/fallback",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    };

    const capability = createSearchCapability({
      name: "primary-with-fallback",
      async fetch(input) {
        const primary = await primaryProvider.fetch(input);

        if (primary.success && primary.data !== undefined) {
          return primary;
        }

        return fallbackProvider.fetch(input);
      },
    });

    const result = await capability.execute(
      { query: "AI India" },
      { permission: "read", requestId: "test" } as never,
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.title).toContain(
      "Fallback result for AI India",
    );
    expect(result.source?.source).toBe("test-fallback");
  });

  it("rejects prepare context with a controlled failure", async () => {
    const capability = createSearchCapability({
      name: "test-provider",
      async fetch() {
        return { success: true, data: [] };
      },
    });

    const result = await capability.execute(
      { query: "test" },
      { requestId: "search-test-prepare", permission: "prepare" } as never,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });

  it("rejects execute context with a controlled failure", async () => {
    const capability = createSearchCapability({
      name: "test-provider",
      async fetch() {
        return { success: true, data: [] };
      },
    });

    const result = await capability.execute(
      { query: "test" },
      { requestId: "search-test-execute", permission: "execute" } as never,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Permission denied");
  });
});