import type {
  ConfidenceMetadata,
  FreshnessMetadata,
  SourceMetadata,
} from "./metadata.js";

export interface MemoryRecord {
  readonly id: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly source?: SourceMetadata;
  readonly freshness?: FreshnessMetadata;
  readonly confidence?: ConfidenceMetadata;
  readonly tags: readonly string[];
}

export interface MemoryQuery {
  readonly text?: string;
  readonly tags?: readonly string[];
  readonly limit?: number;
}

export interface Memory {
  store(record: MemoryRecord): Promise<void>;

  retrieve(query: MemoryQuery): Promise<readonly MemoryRecord[]>;

  get(id: string): Promise<MemoryRecord | null>;

  delete(id: string): Promise<boolean>;
}