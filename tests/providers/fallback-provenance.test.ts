import { describe, expect, it } from "vitest";
import type {
  Provider,
  ProviderResult,
} from "../../src/types/provider.js";
import { FallbackProvider } from "../../src/providers/fallback.provider.js";

type TestData = readonly string[];

const FIXED_TIME = "2026-08-22T12:00:00.000Z";

const successProviderWithSource = (
  name: string,
  data: TestData,
): Provider<string, TestData> => ({
  name,
  async fetch(): Promise<ProviderResult<TestData>> {
    return {
      success: true,
      data,
      source: {
        source: name,
        url: `https://${name}.example.com`,
        retrievedAt: FIXED_TIME,
      },
      freshness: {
        publishedAt: FIXED_TIME,
        ageMinutes: 5,
        score: 1,
      },
    };
  },
});

const failureProviderWithSource = (
  name: string,
  error: string,
): Provider<string, TestData> => ({
  name,
  async fetch(): Promise<ProviderResult<TestData>> {
    return {
      success: false,
      error,
      source: {
        source: name,
        url: `https://${name}.example.com`,
        retrievedAt: FIXED_TIME,
      },
    };
  },
});

describe("FallbackProvider provenance", () => {
  it("successful primary preserves primary source metadata", async () => {
    const provider = new FallbackProvider(
      successProviderWithSource("primary-api", ["primary"]),
      successProviderWithSource("fallback-api", ["fallback"]),
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(["primary"]);
    expect(result.source?.source).toBe("primary-api");
    expect(result.source?.url).toBe(
      "https://primary-api.example.com",
    );
    expect(result.source?.retrievedAt).toBe(FIXED_TIME);
  });

  it("fallback result exposes the fallback provider source metadata", async () => {
    const provider = new FallbackProvider(
      failureProviderWithSource("primary-api", "Primary down."),
      successProviderWithSource("fallback-api", ["fallback"]),
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(["fallback"]);

    // The source must come from the actual fallback provider,
    // not the failed primary.
    expect(result.source?.source).toBe("fallback-api");
    expect(result.source?.url).toBe(
      "https://fallback-api.example.com",
    );
    expect(result.source?.retrievedAt).toBe(FIXED_TIME);
  });

  it("fallback result preserves freshness from the actual provider", async () => {
    const provider = new FallbackProvider(
      failureProviderWithSource("primary-api", "Primary down."),
      successProviderWithSource("fallback-api", ["fallback"]),
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(true);
    expect(result.freshness).toBeDefined();
    expect(result.freshness?.publishedAt).toBe(FIXED_TIME);
    expect(result.freshness?.score).toBe(1);
  });

  it("both-failed result preserves source from the fallback provider", async () => {
    const provider = new FallbackProvider(
      failureProviderWithSource("primary-api", "Primary down."),
      failureProviderWithSource("fallback-api", "Fallback down."),
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(false);
    expect(result.source?.source).toBe("fallback-api");
  });

  it("both-failed result falls back to primary source when fallback has none", async () => {
    const noSourceFallback: Provider<string, TestData> = {
      name: "no-source-fallback",
      async fetch(): Promise<ProviderResult<TestData>> {
        return {
          success: false,
          error: "Fallback failed.",
        };
      },
    };

    const provider = new FallbackProvider(
      failureProviderWithSource("primary-api", "Primary down."),
      noSourceFallback,
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(false);
    expect(result.source?.source).toBe("primary-api");
  });
});
