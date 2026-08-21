import { describe, expect, it } from "vitest";
import type { Provider } from "../../src/types/provider.js";
import { MultiSourceProvider } from "../../src/providers/multi-source.provider.js";

interface TestData {
  readonly id: string;
}

describe("MultiSourceProvider", () => {
  it("fails when every provider fails", async () => {
  const first: Provider<undefined, readonly TestData[]> = {
    name: "first-provider",
    async fetch() {
      return {
        success: false,
        error: "First failed.",
      };
    },
  };

  const second: Provider<undefined, readonly TestData[]> = {
    name: "second-provider",
    async fetch() {
      return {
        success: false,
        error: "Second failed.",
      };
    },
  };

  const provider = new MultiSourceProvider([
    first,
    second,
  ]);

  const result = await provider.fetch(undefined);

  expect(result.success).toBe(false);
  expect(result.error).toContain("First failed.");
  expect(result.error).toContain("Second failed.");
});

  it("keeps successful results when one provider fails", async () => {
  const failing: Provider<undefined, readonly TestData[]> = {
    name: "failing-provider",
    async fetch() {
      return {
        success: false,
        error: "Provider unavailable.",
      };
    },
  };

  const working: Provider<undefined, readonly TestData[]> = {
    name: "working-provider",
    async fetch() {
      return {
        success: true,
        data: [{ id: "working" }],
        source: {
          source: "working-provider",
          retrievedAt: new Date().toISOString(),
        },
      };
    },
  };

  const provider = new MultiSourceProvider([
    failing,
    working,
  ]);

  const result = await provider.fetch(undefined);

  expect(result.success).toBe(true);
  expect(result.data).toEqual([{ id: "working" }]);
});

  it("aggregates successful provider results", async () => {
    const first: Provider<undefined, readonly TestData[]> = {
      name: "first-provider",
      async fetch() {
        return {
          success: true,
          data: [{ id: "first" }],
          source: {
            source: "first-provider",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    };

    const second: Provider<undefined, readonly TestData[]> = {
      name: "second-provider",
      async fetch() {
        return {
          success: true,
          data: [{ id: "second" }],
          source: {
            source: "second-provider",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    };

    const provider = new MultiSourceProvider([first, second]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      { id: "first" },
      { id: "second" },
    ]);
  });
});