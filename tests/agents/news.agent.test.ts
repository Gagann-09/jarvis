import { describe, expect, it } from "vitest";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";

describe("NewsAgent contract", () => {
  it("executes through a validated search capability", async () => {
    const searchCapability = createSearchCapability({
      name: "mock-news-provider",
      async fetch() {
        return {
          success: true,
          data: [
            {
              title: "Mock news",
              url: "https://example.com/news",
              snippet: "Mock result",
            },
          ],
          source: {
            source: "mock-news-provider",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    });

    const context = new AgentContextService({
      requestId: "news-test-001",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI ML news",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.results).toHaveLength(1);
    expect(result.data?.results[0]?.title).toBeDefined();
    expect(result.source?.source).toBe(
      "mock-news-provider",
    );
  });

  it("deduplicates results by URL while preserving order", async () => {
    const searchCapability = createSearchCapability({
      name: "test-provider",
      async fetch() {
        return {
          success: true,
          data: [
            {
              title: "First result",
              url: "https://example.com/first",
              snippet: "First",
            },
            {
              title: "Duplicate first result",
              url: "https://example.com/first",
              snippet: "Duplicate",
            },
            {
              title: "Second result",
              url: "https://example.com/second",
              snippet: "Second",
            },
          ],
          source: {
            source: "test-provider",
            url: "https://example.com",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    });

    const context = new AgentContextService({
      requestId: "news-test-002",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI ML news",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.results).toHaveLength(2);
    expect(result.data?.results[0]?.title).toBe("First result");
    expect(result.data?.results[1]?.title).toBe("Second result");
  });

  it("ranks fresher results before older results", async () => {
    const searchCapability = createSearchCapability({
      name: "gdelt-news-provider",
      async fetch() {
        return {
          success: true,
          data: [
            {
              title: "Older result",
              url: "https://example.com/old",
              snippet: "Older",
              publishedAt: "2026-08-18T12:00:00.000Z",
            },
            {
              title: "Fresh result",
              url: "https://example.com/fresh",
              snippet: "Fresh",
              publishedAt: new Date().toISOString(),
            },
          ],
          source: {
            source: "gdelt-news-provider",
            url: "https://example.com",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    });

    const context = new AgentContextService({
      requestId: "news-test-003",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI ML news",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.results[0]?.title).toBe("Fresh result");
    expect(result.data?.results[1]?.title).toBe("Older result");
  });

  it("preserves original order when ranking scores tie", async () => {
    const searchCapability = createSearchCapability({
      name: "gdelt-news-provider",
      async fetch() {
        return {
          success: true,
          data: [
            {
              title: "First tied result",
              url: "https://example.com/first",
              snippet: "First",
              publishedAt: undefined,
            },
            {
              title: "Second tied result",
              url: "https://example.com/second",
              snippet: "Second",
              publishedAt: undefined,
            },
          ],
          source: {
            source: "gdelt-news-provider",
            url: "https://example.com",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    });

    const context = new AgentContextService({
      requestId: "news-test-004",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI ML news",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.results[0]?.title).toBe(
      "First tied result",
    );
    expect(result.data?.results[1]?.title).toBe(
      "Second tied result",
    );
  });

  it("uses per-result provenance when calculating ranking", async () => {
    const searchCapability = createSearchCapability({
      name: "multi-source",
      async fetch() {
        return {
          success: true,
          data: [
            {
              title: "Less reliable source",
              url: "https://example.com/less-reliable",
              snippet: "Less reliable",
              publishedAt: "2026-08-22T13:00:00.000Z",
              provenance: {
                source: "unknown-provider",
                retrievedAt: new Date().toISOString(),
              },
            },
            {
              title: "Reliable source",
              url: "https://example.com/reliable",
              snippet: "Reliable",
              publishedAt: "2026-08-22T13:00:00.000Z",
              provenance: {
                source: "gdelt-news-provider",
                retrievedAt: new Date().toISOString(),
              },
            },
          ],
          source: {
            source: "multi-source",
            retrievedAt: new Date().toISOString(),
          },
        };
      },
    });

    const context = new AgentContextService({
      requestId: "news-test-005",
      permission: "read",
      relevantMemory: [],
      capabilities: {
        search: searchCapability,
      },
    });

    const agent = new NewsAgent();

    const result = await agent.execute(
      {
        topic: "AI ML news",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.results[0]?.title).toBe(
      "Reliable source",
    );
    expect(result.data?.results[0]?.provenance?.source).toBe(
      "gdelt-news-provider",
    );
  });
});
