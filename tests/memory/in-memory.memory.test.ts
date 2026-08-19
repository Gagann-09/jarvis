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
});