import { describe, expect, it } from "vitest";
import type {
  Provider,
  ProviderResult,
} from "../../src/types/provider.js";
import { FallbackProvider } from "../../src/providers/fallback.provider.js";

type TestData = readonly string[];

const successProvider = (
  name: string,
  data: TestData,
): Provider<string, TestData> => ({
  name,
  async fetch(): Promise<ProviderResult<TestData>> {
    return {
      success: true,
      data,
    };
  },
});

const failureProvider = (
  name: string,
  error: string,
): Provider<string, TestData> => ({
  name,
  async fetch(): Promise<ProviderResult<TestData>> {
    return {
      success: false,
      error,
    };
  },
});

describe("FallbackProvider", () => {
  it("returns primary provider data when primary succeeds", async () => {
    const provider = new FallbackProvider(
      successProvider("primary", ["primary"]),
      successProvider("fallback", ["fallback"]),
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(["primary"]);
  });

  it("uses fallback when primary fails", async () => {
    const provider = new FallbackProvider(
      failureProvider("primary", "Primary failed."),
      successProvider("fallback", ["fallback"]),
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(["fallback"]);
  });

  it("returns failure when both providers fail", async () => {
    const provider = new FallbackProvider(
      failureProvider("primary", "Primary failed."),
      failureProvider("fallback", "Fallback failed."),
    );

    const result = await provider.fetch("test");

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Fallback failed.");
  });
});