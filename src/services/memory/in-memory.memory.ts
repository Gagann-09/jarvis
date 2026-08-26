import type {
  Memory,
  MemoryQuery,
  MemoryRecord,
} from "../../types/memory.js";
import { MemoryRecordSchema, MemoryQuerySchema } from "./memory.schema.js";

export class InMemoryMemory implements Memory {
  private readonly records = new Map<string, MemoryRecord>();

  async store(record: MemoryRecord): Promise<void> {
    MemoryRecordSchema.parse(record);

    this.records.set(record.id, record);
  }

  async retrieve(query: MemoryQuery): Promise<readonly MemoryRecord[]> {
    MemoryQuerySchema.parse(query);

    const text = query.text?.trim().toLowerCase();
    const tags = query.tags ?? [];

    const matches = Array.from(this.records.values())
      .filter((record) => {
        const textMatches =
          text === undefined ||
          record.content.toLowerCase().includes(text);

        const tagsMatch =
          tags.length === 0 ||
          tags.every((tag) => record.tags.includes(tag));

        return textMatches && tagsMatch;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return query.limit === undefined
      ? matches
      : matches.slice(0, query.limit);
  }

  async get(id: string): Promise<MemoryRecord | null> {
    return this.records.get(id) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }
}