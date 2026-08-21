export interface HttpClient {
  get<TResponse>(url: string): Promise<TResponse>;
  getText(url: string): Promise<string>;
}

export class FetchHttpClient implements HttpClient {
  async get<TResponse>(url: string): Promise<TResponse> {
    const text = await this.getText(url);

    try {
      return JSON.parse(text) as TResponse;
    } catch {
      throw new Error(
        `Expected JSON response but received: ${text.slice(0, 200)}`,
      );
    }
  }

  async getText(url: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP request failed with status ${response.status}.`,
      );
    }

    return response.text();
  }
}