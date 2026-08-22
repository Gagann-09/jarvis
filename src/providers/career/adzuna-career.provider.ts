import { z } from "zod";
import type { Provider, ProviderResult } from "../../types/provider.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "../../tools/web/career.schema.js";
import { CareerOpportunitiesSchema } from "../../tools/web/career.schema.js";
import { FetchHttpClient } from "../http/http-client.js";
import type { HttpClient } from "../http/http-client.js";

const ADZUNA_ENDPOINT = "https://api.adzuna.com/v1/api/jobs/in/search/1";

const AdzunaJobSchema = z.object({
  title: z.string(),
  company: z.object({
    display_name: z.string(),
  }),
  location: z.object({
    display_name: z.string().optional(),
  }).optional(),
  redirect_url: z.string().url(),
  description: z.string(),
  created: z.string().datetime().optional(),
});

const AdzunaResponseSchema = z.object({
  results: z.array(AdzunaJobSchema),
});

export class AdzunaCareerProvider
  implements Provider<CareerSearchInput, readonly CareerOpportunity[]>
{
  readonly name = "adzuna-career-provider";

  constructor(
    private readonly httpClient: HttpClient = new FetchHttpClient(),
  ) {}

  async fetch(
    input: CareerSearchInput,
  ): Promise<ProviderResult<readonly CareerOpportunity[]>> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    const url = new URL(ADZUNA_ENDPOINT);

    if (!appId || !appKey) {
      return {
        success: false,
        error: "Adzuna credentials missing.",
        source: {
          source: this.name,
          url: url.toString(),
          retrievedAt: new Date().toISOString(),
        },
      };
    }

    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("what", input.query);
    if (input.location) {
      url.searchParams.set("where", input.location);
    }

    const sourceUrl = new URL(url.toString());
    sourceUrl.searchParams.delete("app_id");
    sourceUrl.searchParams.delete("app_key");

    try {
      const response = await this.httpClient.get<unknown>(url.toString());
      const parsed = AdzunaResponseSchema.parse(response);

      const data = parsed.results.map((job) => ({
        title: job.title,
        organization: job.company.display_name,
        ...(job.location?.display_name && {
          location: job.location.display_name,
        }),
        url: job.redirect_url,
        description: job.description,
        source: this.name,
        ...(job.created && { publishedAt: job.created }),
      }));

      const validatedData = CareerOpportunitiesSchema.parse(data);

      return {
        success: true,
        data: validatedData,
        source: {
          source: this.name,
          url: sourceUrl.toString(),
          retrievedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Adzuna request failed.",
        source: {
          source: this.name,
          url: sourceUrl.toString(),
          retrievedAt: new Date().toISOString(),
        },
      };
    }
  }
}

export const adzunaCareerProvider = new AdzunaCareerProvider();
