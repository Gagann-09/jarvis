import type { FreshnessMetadata, SourceMetadata } from "./metadata.js";

export interface ProviderResult<TData> {
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: string;
  readonly source?: SourceMetadata;
  readonly freshness?: FreshnessMetadata;
}

export interface Provider<TInput, TData> {
  readonly name: string;

  fetch(
    input: TInput,
  ): Promise<ProviderResult<TData>>;
}