export interface SourceMetadata {
  readonly source: string;
  readonly url?: string;
  readonly retrievedAt: string;
}

export interface FreshnessMetadata {
  readonly publishedAt?: string;
  readonly updatedAt?: string;
  readonly expiresAt?: string;
}

export interface ConfidenceMetadata {
  readonly score: number;
  readonly reason?: string;
}