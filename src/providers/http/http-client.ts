export interface HttpClient {
  get<TResponse>(url: string): Promise<TResponse>;
  getText(url: string): Promise<string>;
}

export const DEFAULT_TIMEOUT_MS = 10_000;

export class FetchHttpClient implements HttpClient {
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

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
    let response: Response;

    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "TimeoutError"
      ) {
        throw new Error(
          `Request to ${url} timed out after ${this.timeoutMs}ms.`,
        );
      }

      throw error;
    }

    if (!response.ok) {
      throw new Error(
        `HTTP request failed with status ${response.status}.`,
      );
    }

    return response.text();
  }
}