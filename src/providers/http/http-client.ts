export interface HttpClient {
  get<TResponse>(
    url: string,
  ): Promise<TResponse>;
}

export class FetchHttpClient implements HttpClient {
  async get<TResponse>(url: string): Promise<TResponse> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP request failed with status ${response.status}.`,
      );
    }

    const text = await response.text();

    try {
      return JSON.parse(text) as TResponse;
    } catch {
      throw new Error(
        `Expected JSON response but received: ${text.slice(0, 200)}`,
      );
    }
  }
}