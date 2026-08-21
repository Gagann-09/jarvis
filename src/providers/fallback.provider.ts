import type { Provider, ProviderResult } from "../types/provider.js";

export class FallbackProvider<TInput, TData>
  implements Provider<TInput, TData>
{
  readonly name: string;

  constructor(
    private readonly primary: Provider<TInput, TData>,
    private readonly fallback: Provider<TInput, TData>,
  ) {
    this.name = `${primary.name}-with-${fallback.name}-fallback`;
  }

  async fetch(input: TInput): Promise<ProviderResult<TData>> {
    const primaryResult = await this.primary.fetch(input);

    if (primaryResult.success && primaryResult.data !== undefined) {
      return primaryResult;
    }

    const fallbackResult = await this.fallback.fetch(input);

    if (fallbackResult.success && fallbackResult.data !== undefined) {
      return fallbackResult;
    }

    return {
      success: false,
      error:
        fallbackResult.error ??
        primaryResult.error ??
        "All providers failed.",
      ...(fallbackResult.source ?? primaryResult.source
        ? {
            source:
              fallbackResult.source ?? primaryResult.source,
          }
        : {}),
      ...(fallbackResult.freshness ?? primaryResult.freshness
        ? {
            freshness:
              fallbackResult.freshness ??
              primaryResult.freshness,
          }
        : {}),
    };
  }
}