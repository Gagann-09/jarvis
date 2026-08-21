import { describe, expect, it } from "vitest";
import type {
  Provider,
  ProviderResult,
} from "../../src/types/provider.js";

interface MockProviderData {
  readonly value: string;
}

describe("Provider contract", () => {
  it("returns structured provider data", async () => {
    const provider: Provider<undefined, MockProviderData> = {
      name: "mock-provider",

      async fetch(): Promise<ProviderResult<MockProviderData>> {
        return {
          success: true,
          data: {
            value: "provider-data",
          },
          source: {
            source: "mock-provider",
            url: "https://example.com",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    };

    const result = await provider.fetch(undefined);

    expect(provider.name).toBe("mock-provider");
    expect(result.success).toBe(true);
    expect(result.data?.value).toBe("provider-data");
    expect(result.source?.source).toBe("mock-provider");
  });
});