import type { ProvenanceMetadata } from "../types/metadata.js";
import type {
  Provider,
  ProviderResult,
} from "../types/provider.js";

export class FallbackProvider<TInput, TOutput>
  implements Provider<TInput, TOutput> {
  readonly name: string;

  constructor(
    private readonly primary: Provider<TInput, TOutput>,
    private readonly fallback: Provider<TInput, TOutput>,
  ) {
    this.name = `${primary.name}->${fallback.name}`;
  }

  async fetch(input: TInput): Promise<ProviderResult<TOutput>> {
    let primaryResult: ProviderResult<TOutput> | undefined;

    try {
      primaryResult = await this.primary.fetch(input);

      if (primaryResult.success) {
        return primaryResult;
      }
    } catch (error) {
      primaryResult = {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Primary provider failed.",
      };
    }

    try {
      const fallbackResult = await this.fallback.fetch(input);

      if (fallbackResult.success) {
        const provenance = this.buildAttemptedProvenance(
          primaryResult?.provenance,
          fallbackResult.provenance,
        );

        return {
          ...fallbackResult,
          ...(provenance !== undefined ? { provenance } : {}),
        };
      }

      const provenance = this.buildAttemptedProvenance(
        primaryResult?.provenance,
        fallbackResult.provenance,
      );

      return {
        success: false,
        error:
          fallbackResult.error ??
          primaryResult?.error ??
          "All providers failed.",
        ...(fallbackResult.source !== undefined
          ? { source: fallbackResult.source }
          : primaryResult?.source !== undefined
            ? { source: primaryResult.source }
            : {}),
        ...(fallbackResult.freshness !== undefined
          ? { freshness: fallbackResult.freshness }
          : primaryResult?.freshness !== undefined
            ? { freshness: primaryResult.freshness }
            : {}),
        ...(provenance !== undefined ? { provenance } : {}),
      };
    } catch (error) {
      const provenance = this.buildAttemptedProvenance(
        primaryResult?.provenance,
        undefined,
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallback provider failed.",
        ...(primaryResult?.source !== undefined
          ? { source: primaryResult.source }
          : {}),
        ...(primaryResult?.freshness !== undefined
          ? { freshness: primaryResult.freshness }
          : {}),
        ...(provenance !== undefined ? { provenance } : {}),
      };
    }
  }

  private buildAttemptedProvenance(
    primaryProvenance: ProvenanceMetadata | undefined,
    fallbackProvenance: ProvenanceMetadata | undefined,
  ): ProvenanceMetadata | undefined {
    const primarySources = primaryProvenance?.sources ?? [];
    const fallbackSources = fallbackProvenance?.sources ?? [];

    if (primarySources.length === 0 && fallbackSources.length === 0) {
      return undefined;
    }

    const sources = [...primarySources, ...fallbackSources];

    return {
      sources,
      sourceCount: sources.length,
    };
  }
}