import { describe, expect, it } from "vitest";
import { CareerAgent } from "../../src/agents/career/career.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { searchCapability } from "../../src/tools/web/search.capability.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";
import type { ToolCapability } from "../../src/types/tool.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "../../src/tools/web/career.schema.js";

describe("CareerAgent contract", () => {
  it("executes through the validated career capability", async () => {
    const context = new AgentContextService({
      requestId: "career-agent-test-001",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
    });

    const agent = new CareerAgent();

    const result = await agent.execute(
      {
        query: "AI ML internship",
        location: "Bangalore",
        remote: false,
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.opportunities).toHaveLength(1);

    expect(result.data?.opportunities[0]?.title).toContain(
      "AI ML internship",
    );

    expect(result.data?.opportunities[0]?.organization).toBe(
      "Mock Organization",
    );

    expect(result.data?.opportunities[0]?.source).toBe(
      "mock-career-source",
    );

    expect(result.decision.status).toBe("accept");
    expect(result.decision.confidence.score).toBe(1);
    expect(result.freshness?.score).toBe(1);
    expect(result.source?.source).toBe("mock-career-source");
  });

  it("allows execute context to use read capability through agent", async () => {
    const context = new AgentContextService({
      requestId: "career-agent-test-002",
      permission: "execute",
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
    });

    const agent = new CareerAgent();

    const result = await agent.execute(
      {
        query: "AI ML internship",
        location: "Bangalore",
        remote: false,
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.data?.opportunities).toHaveLength(1);
    expect(result.decision.status).toBe("accept");
  });

  it("requires review for successful low-confidence results", async () => {
    const lowConfidenceCareerCapability: ToolCapability<
      CareerSearchInput,
      readonly CareerOpportunity[]
    > = {
      definition: careerCapability.definition,

      async execute() {
        return {
          success: true,
          data: [
            {
              title: "AI role",
              organization: "Example Org",
              url: "https://example.com/career",
              description: "Low-confidence career result.",
              source: "example-career-source",
            },
          ],
          confidence: {
            score: 0.49,
            reason: "Provider confidence below accept threshold.",
          },
        };
      },
    };

    const context = new AgentContextService({
      requestId: "career-agent-test-003",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: lowConfidenceCareerCapability,
        events: eventsCapability,
      },
    });

    const agent = new CareerAgent();

    const result = await agent.execute(
      {
        query: "AI role",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.decision.status).toBe("review");
    expect(result.decision.confidence.score).toBe(0.49);
  });

  it("preserves capability freshness and provenance metadata", async () => {
    const metadataCareerCapability: ToolCapability<
      CareerSearchInput,
      readonly CareerOpportunity[]
    > = {
      definition: careerCapability.definition,

      async execute() {
        return {
          success: true,
          data: [
            {
              title: "AI Engineer",
              organization: "Example Org",
              url: "https://example.com/career",
              description: "Career opportunity.",
              source: "example-career-source",
              publishedAt: "2026-08-26T10:00:00.000Z",
            },
          ],
          confidence: {
            score: 0.72,
            reason: "Verified capability confidence.",
          },
          source: {
            source: "example-career-source",
            url: "https://example.com/career",
            retrievedAt: "2026-08-26T11:00:00.000Z",
          },
          provenance: {
            sources: [
              {
                source: "example-career-source",
                url: "https://example.com/career",
                retrievedAt: "2026-08-26T11:00:00.000Z",
              },
            ],
            sourceCount: 1,
          },
          freshness: {
            publishedAt: "2026-08-26T10:00:00.000Z",
            ageMinutes: 60,
            score: 1,
          },
        };
      },
    };

    const context = new AgentContextService({
      requestId: "career-agent-test-004",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: metadataCareerCapability,
        events: eventsCapability,
      },
    });

    const agent = new CareerAgent();

    const result = await agent.execute(
      {
        query: "AI Engineer",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.decision.status).toBe("accept");
    expect(result.decision.confidence.score).toBe(0.72);

    expect(result.source?.source).toBe(
      "example-career-source",
    );

    expect(result.provenance?.sourceCount).toBe(1);

    expect(result.provenance?.sources[0]?.source).toBe(
      "example-career-source",
    );

    expect(result.freshness?.score).toBe(1);
    expect(result.freshness?.ageMinutes).toBe(60);
  });

  it("preserves metadata when capability fails", async () => {
    const failingCareerCapability: ToolCapability<
      CareerSearchInput,
      readonly CareerOpportunity[]
    > = {
      definition: careerCapability.definition,

      async execute() {
        return {
          success: false,
          error: "Career provider unavailable.",
          confidence: {
            score: 0.2,
            reason: "Provider unavailable.",
          },
          source: {
            source: "example-career-source",
            url: "https://example.com/career",
            retrievedAt: "2026-08-26T11:00:00.000Z",
          },
          freshness: {
            score: 0,
          },
        };
      },
    };

    const context = new AgentContextService({
      requestId: "career-agent-test-005",
      permission: "read",
      capabilities: {
        search: searchCapability,
        career: failingCareerCapability,
        events: eventsCapability,
      },
    });

    const agent = new CareerAgent();

    const result = await agent.execute(
      {
        query: "AI Engineer",
      },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.decision.status).toBe("review");
    expect(result.decision.confidence.score).toBe(0.2);
    expect(result.error).toBe("Career provider unavailable.");
    expect(result.source?.source).toBe(
      "example-career-source",
    );
    expect(result.freshness?.score).toBe(0);
  });
});