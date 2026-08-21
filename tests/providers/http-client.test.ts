import { describe, expect, it } from "vitest";
import {
  FetchHttpClient,
  type HttpClient,
} from "../../src/providers/http/http-client.js";

describe("HTTP client", () => {
  it("defines the expected provider transport contract", async () => {
    const client: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {
          status: "ok",
        } as TResponse;
      },

      async getText(_url: string): Promise<string> {
        return "text";
      },
    };

    const result = await client.get<{ status: string }>(
      "https://example.com",
    );

    expect(result.status).toBe("ok");
  });

  it("defines the text transport contract", async () => {
    const client: HttpClient = {
      async get<TResponse>(_url: string): Promise<TResponse> {
        return {} as TResponse;
      },

      async getText(_url: string): Promise<string> {
        return "<rss></rss>";
      },
    };

    const result = await client.getText(
      "https://example.com/feed",
    );

    expect(result).toBe("<rss></rss>");
  });

  it("exposes the fetch-based implementation", () => {
    const client = new FetchHttpClient();

    expect(client).toBeInstanceOf(FetchHttpClient);
    expect(typeof client.get).toBe("function");
    expect(typeof client.getText).toBe("function");
  });
});