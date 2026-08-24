import { describe, expect, it } from "vitest";
import type { ProvenanceMetadata } from "../../src/types/metadata.js";
import type { Provider } from "../../src/types/provider.js";
import { MultiSourceProvider } from "../../src/providers/multi-source.provider.js";

interface TestData {
  readonly id: string;
  readonly provenance?: ProvenanceMetadata;
}

const sourceFor = (name: string) => ({
  source: name,
  retrievedAt: "2026-08-24T00:00:00.000Z",
});

const throwingProvider = (
  name: string,
  error: string,
): Provider<undefined, readonly TestData[]> => ({
  name,

  async fetch() {
    throw new Error(error);
  },
});

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
          source: sourceFor("working-provider"),
        };
      },
    };

    const provider = new MultiSourceProvider([
      failing,
      working,
    ]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.id).toBe("working");
    expect(result.data?.[0]?.provenance).toEqual(
      expect.objectContaining({
        source: "working-provider",
      }),
    );
  });

  it("aggregates successful provider results", async () => {
    const first: Provider<undefined, readonly TestData[]> = {
      name: "first-provider",

      async fetch() {
        return {
          success: true,
          data: [{ id: "first" }],
          source: sourceFor("first-provider"),
        };
      },
    };

    const second: Provider<undefined, readonly TestData[]> = {
      name: "second-provider",

      async fetch() {
        return {
          success: true,
          data: [{ id: "second" }],
          source: sourceFor("second-provider"),
        };
      },
    };

    const provider = new MultiSourceProvider([
      first,
      second,
    ]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);

    expect(result.data?.[0]?.id).toBe("first");
    expect(result.data?.[0]?.provenance).toEqual(
      expect.objectContaining({
        source: "first-provider",
      }),
    );

    expect(result.data?.[1]?.id).toBe("second");
    expect(result.data?.[1]?.provenance).toEqual(
      expect.objectContaining({
        source: "second-provider",
      }),
    );
  });

  it("keeps successful results when one provider throws", async () => {
    const throwing = throwingProvider(
      "throwing-provider",
      "Provider exploded.",
    );

    const working: Provider<undefined, readonly TestData[]> = {
      name: "working-provider",

      async fetch() {
        return {
          success: true,
          data: [{ id: "working" }],
          source: sourceFor("working-provider"),
        };
      },
    };

    const provider = new MultiSourceProvider([
      throwing,
      working,
    ]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.id).toBe("working");
    expect(result.data?.[0]?.provenance).toEqual(
      expect.objectContaining({
        source: "working-provider",
      }),
    );
  });

  it("records successful provider provenance in deterministic order", async () => {
    const first: Provider<undefined, readonly TestData[]> = {
      name: "first-provider",

      async fetch() {
        return {
          success: true,
          data: [{ id: "first" }],
          source: sourceFor("first-provider"),
        };
      },
    };

    const second: Provider<undefined, readonly TestData[]> = {
      name: "second-provider",

      async fetch() {
        return {
          success: true,
          data: [{ id: "second" }],
          source: sourceFor("second-provider"),
        };
      },
    };

    const provider = new MultiSourceProvider([
      first,
      second,
    ]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(true);
    expect(result.provenance?.sourceCount).toBe(2);
    expect(
      result.provenance?.sources.map(
        (source) => source.source,
      ),
    ).toEqual([
      "first-provider",
      "second-provider",
    ]);
  });

  it("preserves failed-provider provenance when all providers fail", async () => {
    const first: Provider<undefined, readonly TestData[]> = {
      name: "first-provider",

      async fetch() {
        return {
          success: false,
          error: "First failed.",
          source: sourceFor("first-provider"),
        };
      },
    };

    const second: Provider<undefined, readonly TestData[]> = {
      name: "second-provider",

      async fetch() {
        return {
          success: false,
          error: "Second failed.",
          source: sourceFor("second-provider"),
        };
      },
    };

    const provider = new MultiSourceProvider([
      first,
      second,
    ]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(false);
    expect(result.provenance?.sourceCount).toBe(2);
    expect(
      result.provenance?.sources.map(
        (source) => source.source,
      ),
    ).toEqual([
      "first-provider",
      "second-provider",
    ]);
  });

  it("handles thrown providers when every provider throws", async () => {
    const provider = new MultiSourceProvider([
      throwingProvider(
        "first-provider",
        "First exploded.",
      ),
      throwingProvider(
        "second-provider",
        "Second exploded.",
      ),
    ]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(false);
    expect(result.error).toContain("First exploded.");
    expect(result.error).toContain("Second exploded.");
    expect(result.provenance).toBeUndefined();
  });

  it("handles an empty provider list deterministically", async () => {
    const provider = new MultiSourceProvider<
      undefined,
      TestData
    >([]);

    const result = await provider.fetch(undefined);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "All news providers failed.",
    );
    expect(result.data).toBeUndefined();
    expect(result.provenance).toBeUndefined();
  });
});