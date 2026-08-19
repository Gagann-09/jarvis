import { describe, expect, it } from "vitest";
import {
  MockSearchTool,
  type SearchInput,
} from "../../src/tools/web/mock-search.tool.js";

describe("MockSearchTool contract", () => {
  it("implements a read-only tool and returns structured provenance", async () => {
    const tool = new MockSearchTool();

    const input: SearchInput = {
      query: "AI internships Bangalore",
    };

    const result = await tool.execute(input, {
      requestId: "test-request-001",
      permission: "read",
    });

    expect(tool.definition.name).toBe("mock_search");
    expect(tool.definition.permission).toBe("read");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);

    expect(result.source?.source).toBe("mock-search");
    expect(result.source?.url).toBe("https://example.com");

    expect(result.confidence?.score).toBe(1);
  });
});