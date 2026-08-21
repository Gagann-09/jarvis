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
    };

    const result = await client.get<{ status: string }>(
      "https://example.com",
    );

    expect(result.status).toBe("ok");
  });

  it("exposes the fetch-based implementation", () => {
    const client = new FetchHttpClient();

    expect(client).toBeInstanceOf(FetchHttpClient);
    expect(typeof client.get).toBe("function");
  });
});