import type { Provider, ProviderResult } from "../types/provider.js";

export class MultiSourceProvider<TInput, TData>
  implements Provider<TInput, readonly TData[]>
{
  readonly name: string;

  constructor(
    private readonly providers: readonly Provider<
      TInput,
      readonly TData[]
    >[],
  ) {
    this.name = providers
      .map((provider) => provider.name)
      .join("+");
  }

  async fetch(
    input: TInput,
  ): Promise<ProviderResult<readonly TData[]>> {
    const results = await Promise.all(
      this.providers.map((provider) =>
        provider.fetch(input),
      ),
    );

    const successful = results.filter(
      (
        result,
      ): result is ProviderResult<readonly TData[]> & {
        data: readonly TData[];
      } =>
        result.success &&
        result.data !== undefined,
    );

    if (successful.length === 0) {
      const source = results.find(
        (result) => result.source !== undefined,
      )?.source;

      const freshness = results.find(
        (result) => result.freshness !== undefined,
      )?.freshness;

      return {
        success: false,
        error:
          results
            .map((result) => result.error)
            .filter(
              (error): error is string =>
                error !== undefined,
            )
            .join(" | ") ||
          "All news providers failed.",
        ...(source !== undefined && { source }),
        ...(freshness !== undefined && { freshness }),
      };
    }

    const freshness = successful.find(
      (result) => result.freshness !== undefined,
    )?.freshness;

    return {
      success: true,
      data: successful.flatMap(
        (result) => result.data,
      ),
      source: {
        source: this.name,
        retrievedAt: new Date().toISOString(),
      },
      ...(freshness !== undefined && { freshness }),
    };
  }
}

export const createMultiSourceProvider = <
  TInput,
  TData,
>(
  providers: readonly Provider<
    TInput,
    readonly TData[]
  >[],
): MultiSourceProvider<TInput, TData> =>
  new MultiSourceProvider(providers);