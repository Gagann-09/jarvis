import type { Provider, ProviderResult } from "../types/provider.js";
import type { ProvenanceMetadata, SourceMetadata } from "../types/metadata.js";

export class MultiSourceProvider<TInput, TData extends object>
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

    const data = successful.flatMap(({ result }) =>
      result.data.map(
        (item) =>
          ({
            ...item,
            provenance: result.source,
          }) as TData,
      ),
    );

    const sources: SourceMetadata[] = successful
      .map((entry) => entry.result.source)
      .filter(
        (source): source is SourceMetadata =>
          source !== undefined,
      );

    const provenance: ProvenanceMetadata = {
      sources,
      sourceCount: sources.length,
    };

    const freshness = successful.find(
      (entry) => entry.result.freshness !== undefined,
    )?.result.freshness;

    return {
      success: true,
      data,
      provenance,
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
  TData extends object,
>(
  providers: readonly Provider<
    TInput,
    readonly TData[]
  >[],
): MultiSourceProvider<TInput, TData> =>
  new MultiSourceProvider(providers);