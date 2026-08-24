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
        return fallbackResult;
      }

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
        ...(fallbackResult.provenance !== undefined
          ? { provenance: fallbackResult.provenance }
          : primaryResult?.provenance !== undefined
            ? { provenance: primaryResult.provenance }
            : {}),
      };
    } catch (error) {
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
        ...(primaryResult?.provenance !== undefined
          ? { provenance: primaryResult.provenance }
          : {}),
      };
    }
  }
}