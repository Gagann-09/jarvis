import { describe, expect, it } from "vitest";
import { InMemoryMemory } from "../../src/services/memory/in-memory.memory.js";
import type { MemoryRecord } from "../../src/types/memory.js";

const createRecord = (overrides: Partial<MemoryRecord> = {}): MemoryRecord => {
  const timestamp = new Date().toISOString();

  return {
    id: "memory-001",
    content: "AI internship opportunity in Bangalore",
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: ["career", "internship"],
    ...overrides,
  };
};

describe("InMemoryMemory contract", () => {
  it("stores and retrieves a memory", async () => {
    const memory = new InMemoryMemory();
    const record = createRecord();

    await memory.store(record);

    await expect(memory.get(record.id)).resolves.toEqual(record);
  });

  it("retrieves memories by text", async () => {
    const memory = new InMemoryMemory();

    await memory.store(createRecord());

    const results = await memory.retrieve({
      text: "internship",
    });

    expect(results).toHaveLength(1);
  });

  it("retrieves memories by tags", async () => {
    const memory = new InMemoryMemory();

    await memory.store(createRecord());

    const results = await memory.retrieve({
      tags: ["career"],
    });

    expect(results).toHaveLength(1);
  });

  it("respects the retrieval limit", async () => {
    const memory = new InMemoryMemory();

    await memory.store(createRecord({ id: "memory-001" }));
    await memory.store(
      createRecord({
        id: "memory-002",
        content: "Another AI internship opportunity",
      }),
    );

    const results = await memory.retrieve({
      text: "internship",
      limit: 1,
    });

    expect(results).toHaveLength(1);
  });

  it("deletes a memory", async () => {
    const memory = new InMemoryMemory();
    const record = createRecord();

    await memory.store(record);

    await expect(memory.delete(record.id)).resolves.toBe(true);
    await expect(memory.get(record.id)).resolves.toBeNull();
  });

  it("returns false when deleting an unknown memory", async () => {
    const memory = new InMemoryMemory();

    await expect(memory.delete("unknown")).resolves.toBe(false);
  });

  it("preserves provenance metadata when storing a memory", async () => {
    const memory = new InMemoryMemory();

    const record = createRecord({
      source: {
        source: "test-source",
        url: "https://example.com",
        retrievedAt: "2026-08-24T18:00:00.000Z",
      },
      freshness: {
        publishedAt: "2026-08-24T17:00:00.000Z",
        ageMinutes: 60,
        score: 0.9,
      },
      confidence: {
        score: 0.95,
        reason: "Verified test metadata.",
      },
    });

    await memory.store(record);

    await expect(memory.get(record.id)).resolves.toEqual(record);
  });

  it("returns only memories matching all requested tags", async () => {
    const memory = new InMemoryMemory();

    await memory.store(
      createRecord({
        id: "career-ai",
        tags: ["career", "ai"],
      }),
    );

    await memory.store(
      createRecord({
        id: "career-events",
        tags: ["career", "events"],
      }),
    );

    const results = await memory.retrieve({
      tags: ["career", "ai"],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("career-ai");
  });
});

describe("InMemoryMemory validation", () => {
  it("rejects a record with an empty id", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ id: "" })),
    ).rejects.toThrow();
  });

  it("rejects a record with a whitespace-only id", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ id: "   " })),
    ).rejects.toThrow();
  });

  it("rejects a record with an empty content", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ content: "" })),
    ).rejects.toThrow();
  });

  it("rejects a record with whitespace-only content", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ content: "   " })),
    ).rejects.toThrow();
  });

  it("rejects a record with an empty createdAt", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ createdAt: "" })),
    ).rejects.toThrow();
  });

  it("rejects a record with an empty updatedAt", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ updatedAt: "" })),
    ).rejects.toThrow();
  });

  it("rejects a record with whitespace-only createdAt", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ createdAt: "   " })),
    ).rejects.toThrow();
  });

  it("rejects a record with a malformed createdAt", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ createdAt: "not-a-date" })),
    ).rejects.toThrow();
  });

  it("rejects a record with a malformed updatedAt", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ updatedAt: "August 26, 2026" })),
    ).rejects.toThrow();
  });

  it("rejects a record with a date-only createdAt (no time component)", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(createRecord({ createdAt: "2026-08-26" })),
    ).rejects.toThrow();
  });

  it("accepts a record with valid ISO timestamps", async () => {
    const memory = new InMemoryMemory();

    const record = createRecord({
      id: "iso-valid",
      createdAt: "2026-08-26T12:00:00.000Z",
      updatedAt: "2026-08-26T13:00:00.000Z",
    });

    await memory.store(record);

    await expect(memory.get(record.id)).resolves.toEqual(record);
  });

  it("rejects a confidence score above 1", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(
        createRecord({
          confidence: { score: 1.5, reason: "Too high." },
        }),
      ),
    ).rejects.toThrow();
  });

  it("rejects a confidence score below 0", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.store(
        createRecord({
          confidence: { score: -0.1, reason: "Too low." },
        }),
      ),
    ).rejects.toThrow();
  });

  it("accepts a confidence score at boundary 0", async () => {
    const memory = new InMemoryMemory();

    const record = createRecord({
      confidence: { score: 0, reason: "Minimum." },
    });

    await memory.store(record);

    await expect(memory.get(record.id)).resolves.toEqual(record);
  });

  it("accepts a confidence score at boundary 1", async () => {
    const memory = new InMemoryMemory();

    const record = createRecord({
      confidence: { score: 1, reason: "Maximum." },
    });

    await memory.store(record);

    await expect(memory.get(record.id)).resolves.toEqual(record);
  });

  it("rejects a query with limit of 0", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.retrieve({ limit: 0 }),
    ).rejects.toThrow();
  });

  it("rejects a query with a negative limit", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.retrieve({ limit: -5 }),
    ).rejects.toThrow();
  });

  it("rejects a query with a non-integer limit", async () => {
    const memory = new InMemoryMemory();

    await expect(
      memory.retrieve({ limit: 1.5 }),
    ).rejects.toThrow();
  });
});

describe("InMemoryMemory deterministic ordering", () => {
  it("retrieves records newest-first by updatedAt", async () => {
    const memory = new InMemoryMemory();

    await memory.store(
      createRecord({
        id: "oldest",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
    );

    await memory.store(
      createRecord({
        id: "newest",
        updatedAt: "2026-08-03T00:00:00.000Z",
      }),
    );

    await memory.store(
      createRecord({
        id: "middle",
        updatedAt: "2026-08-02T00:00:00.000Z",
      }),
    );

    const results = await memory.retrieve({});

    expect(results).toHaveLength(3);
    expect(results[0]?.id).toBe("newest");
    expect(results[1]?.id).toBe("middle");
    expect(results[2]?.id).toBe("oldest");
  });

  it("returns deterministic order for empty query", async () => {
    const memory = new InMemoryMemory();

    await memory.store(
      createRecord({
        id: "b",
        updatedAt: "2026-08-10T00:00:00.000Z",
      }),
    );

    await memory.store(
      createRecord({
        id: "a",
        updatedAt: "2026-08-20T00:00:00.000Z",
      }),
    );

    const first = await memory.retrieve({});
    const second = await memory.retrieve({});

    expect(first).toEqual(second);
    expect(first[0]?.id).toBe("a");
    expect(first[1]?.id).toBe("b");
  });

  it("applies limit after sorting newest-first", async () => {
    const memory = new InMemoryMemory();

    await memory.store(
      createRecord({
        id: "old",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
    );

    await memory.store(
      createRecord({
        id: "new",
        updatedAt: "2026-08-05T00:00:00.000Z",
      }),
    );

    const results = await memory.retrieve({ limit: 1 });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("new");
  });
});

describe("InMemoryMemory metadata preservation", () => {
  it("round-trips all optional metadata fields without transformation", async () => {
    const memory = new InMemoryMemory();

    const record = createRecord({
      id: "metadata-full",
      source: {
        source: "gdelt",
        url: "https://gdelt.example.com/article/1",
        retrievedAt: "2026-08-26T12:00:00.000Z",
      },
      freshness: {
        publishedAt: "2026-08-26T10:00:00.000Z",
        updatedAt: "2026-08-26T11:00:00.000Z",
        expiresAt: "2026-08-27T10:00:00.000Z",
        ageMinutes: 120,
        score: 0.85,
      },
      confidence: {
        score: 0.92,
        reason: "Multi-source confirmed.",
      },
    });

    await memory.store(record);

    const retrieved = await memory.get(record.id);

    expect(retrieved).toEqual(record);
    expect(retrieved?.source).toEqual(record.source);
    expect(retrieved?.freshness).toEqual(record.freshness);
    expect(retrieved?.confidence).toEqual(record.confidence);
  });

  it("round-trips a record with no optional metadata", async () => {
    const memory = new InMemoryMemory();

    const record: MemoryRecord = {
      id: "bare-minimum",
      content: "Minimal record with no metadata.",
      createdAt: "2026-08-26T00:00:00.000Z",
      updatedAt: "2026-08-26T00:00:00.000Z",
      tags: [],
    };

    await memory.store(record);

    const retrieved = await memory.get(record.id);

    expect(retrieved).toEqual(record);
    expect(retrieved?.source).toBeUndefined();
    expect(retrieved?.freshness).toBeUndefined();
    expect(retrieved?.confidence).toBeUndefined();
  });

  it("stores the exact object reference without cloning or mutating", async () => {
    const memory = new InMemoryMemory();

    const record = createRecord({ id: "exact-ref" });

    await memory.store(record);

    const retrieved = await memory.get(record.id);

    expect(retrieved).toBe(record);
  });
});