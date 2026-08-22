import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AdzunaCareerProvider } from "../../src/providers/career/adzuna-career.provider.js";
import type { HttpClient } from "../../src/providers/http/http-client.js";
import { FallbackProvider } from "../../src/providers/fallback.provider.js";
import { mockCareerProvider } from "../../src/providers/career/mock-career.provider.js";

const mockResponse = {
  results: [
    {
      title: "Software Engineer",
      company: { display_name: "Tech Corp" },
      location: { display_name: "Remote" },
      redirect_url: "https://example.com/job/1",
      description: "Great job",
      created: "2023-10-01T10:00:00Z",
    },
  ],
};

const malformedResponse = {
  results: [
    {
      title: "Software Engineer",
      // missing company
    },
  ],
};

const mappedInvalidResponse = {
  results: [
    {
      title: "   ", // valid string, but will fail trim().min(1) in CareerOpportunitySchema
      company: { display_name: "Tech Corp" },
      redirect_url: "https://example.com/job/1",
      description: "Great job",
    },
  ],
};

describe("AdzunaCareerProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails deterministically when credentials are missing", async () => {
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;

    const httpClient = {
      get: vi.fn(),
      getText: vi.fn(),
    };

    const provider = new AdzunaCareerProvider(httpClient);
    const result = await provider.fetch({ query: "developer" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("credentials missing");
    expect(httpClient.get).not.toHaveBeenCalled();
  });

  it("handles HTTP failure gracefully", async () => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";

    const httpClient = {
      get: vi.fn().mockRejectedValue(new Error("Network error")),
      getText: vi.fn(),
    };

    const provider = new AdzunaCareerProvider(httpClient);
    const result = await provider.fetch({ query: "developer" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error");
  });

  it("handles malformed responses gracefully", async () => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";

    const httpClient: HttpClient = {
      get: vi.fn().mockResolvedValue(malformedResponse),
      getText: vi.fn(),
    };

    const provider = new AdzunaCareerProvider(httpClient);
    const result = await provider.fetch({ query: "developer" });

    expect(result.success).toBe(false);
    expect(result.error).not.toBeUndefined();
  });

  it("maps successful responses to CareerOpportunity correctly", async () => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";

    const httpClient: HttpClient = {
      get: vi.fn().mockResolvedValue(mockResponse),
      getText: vi.fn(),
    };

    const provider = new AdzunaCareerProvider(httpClient);
    const result = await provider.fetch({ query: "developer", location: "Remote" });

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        title: "Software Engineer",
        organization: "Tech Corp",
        location: "Remote",
        url: "https://example.com/job/1",
        description: "Great job",
        source: "adzuna-career-provider",
        publishedAt: "2023-10-01T10:00:00Z",
      });
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining("what=developer")
      );
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining("where=Remote")
      );
    }
  });

  it("rejects an invalid mapped Adzuna job during final validation", async () => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";

    const httpClient: HttpClient = {
      get: vi.fn().mockResolvedValue(mappedInvalidResponse),
      getText: vi.fn(),
    };

    const provider = new AdzunaCareerProvider(httpClient);
    const result = await provider.fetch({ query: "developer" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("too_small");
  });

  it("falls back to mock provider on failure via FallbackProvider", async () => {
    process.env.ADZUNA_APP_ID = "test-id";
    process.env.ADZUNA_APP_KEY = "test-key";

    const httpClient: HttpClient = {
      get: vi.fn().mockRejectedValue(new Error("API Down")),
      getText: vi.fn(),
    };

    const adzuna = new AdzunaCareerProvider(httpClient);
    const provider = new FallbackProvider(adzuna, mockCareerProvider);

    const result = await provider.fetch({ query: "developer" });

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data[0]?.source).toBe("mock-career-source");
    }
  });
});
