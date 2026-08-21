import type { Provider, ProviderResult } from "../types/provider.js";
import type { SearchResult } from "../tools/web/search.schema.js";

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
      this.providers.map(async (provider) => ({
        provider,
        result: await provider.fetch(input),
      })),
    );

    const successful = results.filter(
      (
        entry,
      ): entry is {
        provider: Provider<TInput, readonly TData[]>;
        result: ProviderResult<readonly TData[]> & {
          data: readonly TData[];
        };
      } =>
        entry.result.success &&
        entry.result.data !== undefined,
    );

    if (successful.length === 0) {
      const source = results.find(
        (entry) => entry.result.source !== undefined,
      )?.result.source;

      const freshness = results.find(
        (entry) => entry.result.freshness !== undefined,
      )?.result.freshness;

      return {
        success: false,
        error:
          results
            .map((entry) => entry.result.error)
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

    const data = successful.flatMap(
      ({ provider, result }) =>
        result.data.map((item) => {
          const searchResult =
            item as TData & Partial<SearchResult>;

          if (
            typeof searchResult === "object" &&
            searchResult !== null &&
            "url" in searchResult
          ) {
            return {
              ...searchResult,
              provenance: result.source,
            } as TData;
          }

          return item;
        }),
    );

    const freshness = successful.find(
      (entry) => entry.result.freshness !== undefined,
    )?.result.freshness;

    return {
      success: true,
      data,
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