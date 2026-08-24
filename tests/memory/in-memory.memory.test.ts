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