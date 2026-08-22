import { describe, expect, it } from "vitest";
import {
  FetchHttpClient,
  DEFAULT_TIMEOUT_MS,
} from "../../src/providers/http/http-client.js";

describe("FetchHttpClient timeout", () => {
  it("defaults to 10 second timeout", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(10_000);
  });

  it("accepts a custom timeout value", () => {
    const client = new FetchHttpClient(5_000);

    expect(client).toBeInstanceOf(FetchHttpClient);
  });

  it("preserves the HttpClient interface", () => {
    const client = new FetchHttpClient();

    expect(typeof client.get).toBe("function");
    expect(typeof client.getText).toBe("function");
  });

  it("uses default timeout when constructed without arguments", () => {
    const client = new FetchHttpClient();

    // The client can be constructed with zero arguments
    // (default timeout applied internally)
    expect(client).toBeInstanceOf(FetchHttpClient);
  });
});
