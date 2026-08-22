import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MeetupEventsProvider } from "../../src/providers/events/meetup-events.provider.js";
import { FallbackProvider } from "../../src/providers/fallback.provider.js";
import { mockEventsProvider } from "../../src/providers/events/mock-events.provider.js";
import type { HttpClient } from "../../src/providers/http/http-client.js";
import type { EventsSearchInput } from "../../src/tools/web/events.schema.js";

const mockHttpClient = {
  get: vi.fn(),
  getText: vi.fn(),
  post: vi.fn(),
} satisfies HttpClient;

describe("MeetupEventsProvider", () => {
  let provider: MeetupEventsProvider;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, MEETUP_ACCESS_TOKEN: "test_token" };
    vi.clearAllMocks();
    provider = new MeetupEventsProvider(mockHttpClient);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const defaultInput: EventsSearchInput = {
    query: "technology",
  };

  it("1. should fail if token is missing", async () => {
    process.env.MEETUP_ACCESS_TOKEN = "";
    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Missing MEETUP_ACCESS_TOKEN");
    }
  });

  it("2. should successfully map a fully populated event", async () => {
    mockHttpClient.post.mockResolvedValueOnce({
      data: {
        eventSearch: {
          edges: [
            {
              node: {
                id: "1",
                title: "Tech Meetup",
                eventUrl: "https://meetup.com/events/1",
                description: "A great tech event.",
                dateTime: "2026-10-01T18:00:00Z",
                endTime: "2026-10-01T20:00:00Z",
                isOnline: false,
                venue: {
                  name: "Tech Hub",
                  city: "San Francisco",
                  state: "CA",
                  country: "US",
                  lat: 37.7749,
                  lon: -122.4194,
                },
                group: {
                  name: "SF Tech Group",
                  urlname: "sf-tech-group",
                },
              },
            },
          ],
        },
      },
    });

    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data).toHaveLength(1);
      const event = result.data[0];
      expect(event).toMatchObject({
        title: "Tech Meetup",
        organizer: "SF Tech Group",
        location: "Tech Hub, San Francisco, CA, US",
        url: "https://meetup.com/events/1",
        description: "A great tech event.",
        startsAt: "2026-10-01T18:00:00Z",
        endsAt: "2026-10-01T20:00:00Z",
        source: "meetup",
      });
    }
  });

  it("3. should use 'Online Event' when isOnline is true and venue is absent", async () => {
    mockHttpClient.post.mockResolvedValueOnce({
      data: {
        eventSearch: {
          edges: [
            {
              node: {
                id: "2",
                title: "Online Meetup",
                eventUrl: "https://meetup.com/events/2",
                description: "Virtual event.",
                dateTime: "2026-10-01T18:00:00Z",
                isOnline: true,
                venue: null,
                group: {
                  name: "Global Tech",
                  urlname: "global-tech",
                },
              },
            },
          ],
        },
      },
    });

    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data[0].location).toBe("Online Event");
    }
  });

  it("4. should handle missing endTime", async () => {
    mockHttpClient.post.mockResolvedValueOnce({
      data: {
        eventSearch: {
          edges: [
            {
              node: {
                id: "3",
                title: "No End Time Meetup",
                eventUrl: "https://meetup.com/events/3",
                description: "Short event.",
                dateTime: "2026-10-01T18:00:00Z",
                endTime: null,
                isOnline: true,
                venue: null,
                group: {
                  name: "Global Tech",
                  urlname: "global-tech",
                },
              },
            },
          ],
        },
      },
    });

    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data[0].endsAt).toBeUndefined();
    }
  });

  it("5. should fail gracefully on malformed GraphQL response", async () => {
    mockHttpClient.post.mockResolvedValueOnce({
      data: {
        eventSearch: {
          edges: [
            {
              node: {
                // missing required fields
                id: "4",
                title: "Invalid Event",
              },
            },
          ],
        },
      },
    });

    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Malformed Meetup API response");
    }
  });

  it("6. should fail gracefully on GraphQL errors", async () => {
    mockHttpClient.post.mockResolvedValueOnce({
      data: null,
      errors: [
        { message: "Internal server error" }
      ],
    });

    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Meetup GraphQL error: Internal server error");
    }
  });

  it("7. should fail gracefully on HTTP failure", async () => {
    mockHttpClient.post.mockRejectedValueOnce(new Error("Network Error"));

    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Meetup API request failed: Network Error");
    }
  });

  it("8. should pass correct initial query and variables (pagination contract)", async () => {
    mockHttpClient.post.mockResolvedValueOnce({
      data: { eventSearch: { edges: [] } },
    });

    await provider.fetch({ query: "AI", location: "New York" });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      "https://api.meetup.com/gql-ext",
      expect.objectContaining({
        query: expect.stringContaining("eventSearch(filter: $filter, first: $first)"),
        variables: {
          filter: { query: "AI New York" },
          first: 20,
        },
      }),
      expect.objectContaining({
        Authorization: "Bearer test_token",
      })
    );
  });

  it("9. should not leak credentials in error messages", async () => {
    mockHttpClient.post.mockRejectedValueOnce(new Error("Failed with test_token in message"));

    const result = await provider.fetch(defaultInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain("test_token");
      expect(result.error).toContain("[REDACTED]");
    }
  });

  it("10. should fallback to mock provider via FallbackProvider", async () => {
    mockHttpClient.post.mockRejectedValueOnce(new Error("Network Error"));

    const fallbackProvider = new FallbackProvider(provider, mockEventsProvider);
    
    const result = await fallbackProvider.fetch(defaultInput);
    
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.source?.source).toBe("mock-events-source");
      expect(result.data[0].title).toBe("Event for technology");
    }
  });
});
