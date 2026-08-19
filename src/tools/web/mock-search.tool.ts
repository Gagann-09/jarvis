import type {
  SearchInput,
  SearchResult,
} from "./search.schema.js";
import type {
  Tool,
  ToolExecutionContext,
  ToolResult,
} from "../../types/tool.js";

export class MockSearchTool implements Tool<SearchInput, SearchResult[]> {
  readonly definition = {
    name: "mock_search",
    description: "Performs a deterministic read-only search for testing.",
    permission: "read" as const,
  };

  async execute(
    input: SearchInput,
    _context: ToolExecutionContext,
  ): Promise<ToolResult<SearchResult[]>> {
    const result: SearchResult = {
      title: `Mock result for ${input.query}`,
      url: "https://example.com",
      snippet: "Deterministic test result.",
    };

    return {
      success: true,
      data: [result],
      source: {
        source: "mock-search",
        url: result.url,
        retrievedAt: new Date().toISOString(),
      },
      confidence: {
        score: 1,
        reason: "Deterministic mock data.",
      },
    };
  }
}