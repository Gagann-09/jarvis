import { describe, expect, it } from "vitest";
import type {
  Provider,
  ProviderResult,
} from "../../src/types/provider.js";

describe("Provider failure contract", () => {
  it("returns a controlled failure", async () => {
    const provider: Provider<undefined, string> = {
      name: "failing-provider",

      async fetch(): Promise<ProviderResult<string>> {
        return {
          success: false,
          error: "Provider unavailable.",
          source: {
            source: "failing-provider",
            url: "https://example.com",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    };

    const result = await provider.fetch(undefined);

    expect(provider.name).toBe("failing-provider");
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Provider unavailable.");
    expect(result.source?.source).toBe("failing-provider");
  });
});