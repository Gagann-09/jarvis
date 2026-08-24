import type {
  FreshnessMetadata,
  ProvenanceMetadata,
  SourceMetadata,
} from "./metadata.js";

export type ProviderResult<TData> =
  | {
    readonly success: true;
    readonly data: TData;
    readonly error?: never;
    readonly source?: SourceMetadata;
    readonly provenance?: ProvenanceMetadata;
    readonly freshness?: FreshnessMetadata;
  }
  | {
    readonly success: false;
    readonly data?: never;
    readonly error: string;
    readonly source?: SourceMetadata;
    readonly provenance?: ProvenanceMetadata;
    readonly freshness?: FreshnessMetadata;
  };

export interface Provider<TInput, TData> {
  readonly name: string;

  fetch(
    input: TInput,
  ): Promise<ProviderResult<TData>>;
}