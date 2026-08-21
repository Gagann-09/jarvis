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

    return (await response.json()) as TResponse;
  }
}