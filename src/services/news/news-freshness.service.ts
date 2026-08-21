import type { FreshnessMetadata } from "../../types/metadata.js";

export class NewsFreshnessService {
  calculate(
    publishedAt: string | undefined,
    now = new Date(),
  ): FreshnessMetadata {
    if (!publishedAt) {
      return {
        score: 0,
      };
    }

    const publishedTime = new Date(publishedAt).getTime();
    const currentTime = now.getTime();

    if (Number.isNaN(publishedTime)) {
      return {
        score: 0,
      };
    }

    const ageMinutes = Math.max(
      0,
      (currentTime - publishedTime) / 60000,
    );

    let score: number;

    if (ageMinutes <= 60) {
      score = 1;
    } else if (ageMinutes <= 360) {
      score = 0.8;
    } else if (ageMinutes <= 1440) {
      score = 0.6;
    } else if (ageMinutes <= 4320) {
      score = 0.4;
    } else if (ageMinutes <= 10080) {
      score = 0.2;
    } else {
      score = 0;
    }

    return {
      publishedAt,
      ageMinutes: Math.round(ageMinutes),
      score,
    };
  }
}

export const newsFreshnessService =
  new NewsFreshnessService();