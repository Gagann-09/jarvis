export class NewsReliabilityService {
  private readonly reliability: Readonly<Record<string, number>> = {
    "gdelt-news-provider": 0.9,
    "google-news-provider": 0.85,
    "mock-news-provider": 0.2,
  };

  score(providerName: string): number {
    return this.reliability[providerName] ?? 0.5;
  }
}

export const newsReliabilityService =
  new NewsReliabilityService();