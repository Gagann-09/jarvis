import { describe, expect, it } from "vitest";
import { CareerAgent } from "../../src/agents/career/career.agent.js";
import { EventsAgent } from "../../src/agents/events/events.agent.js";
import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { OrchestratorService } from "../../src/core/orchestrator/orchestrator.service.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";
import { mockNewsProvider } from "../../src/providers/news/mock-news.provider.js";
import type {
  Agent,
  AgentResult,
} from "../../src/types/agent.js";
import type { AgentContext } from "../../src/types/agent-context.js";

const createContext = (requestId: string) =>
  new AgentContextService({
    requestId,
    permission: "read",
    capabilities: {
      search: createSearchCapability(mockNewsProvider),
      career: careerCapability,
      events: eventsCapability,
    },
  });

describe("Orchestrator contract", () => {
  it("forwards request input and context unchanged to the registered agent", async () => {
    const orchestrator = new OrchestratorService();
    const input = { prompt: "preserve input" };
    const context = createContext("orchestrator-forward-001");
    let receivedInput: unknown;
    let receivedContext: AgentContext | undefined;

    const probeAgent: Agent<typeof input, { ok: boolean }> = {
      definition: { name: "probe", description: "Captures inputs" },
      execute: async (agentInput, agentContext) => {
        receivedInput = agentInput;
        receivedContext = agentContext;

        return {
          success: true,
          data: { ok: true },
          decision: {
            status: "accept",
            confidence: {
              score: 1,
            },
            reason: "Input and context received.",
          },
        };
      },
    };

    orchestrator.registerAgent(probeAgent);

    const result = await orchestrator.execute(
      {
        agentName: "probe",
        input,
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(receivedInput).toBe(input);
    expect(receivedContext).toBe(context);
  });

  it("wraps the full agent result without flattening decision metadata", async () => {
    const orchestrator = new OrchestratorService();
    const agentResult: AgentResult<{ value: string }> = {
      success: true,
      data: { value: "ok" },
      decision: {
        status: "review",
        confidence: {
          score: 0.75,
          reason: "Probe confidence.",
        },
        reason: "Probe result requires review.",
      },
      source: {
        source: "probe-source",
        retrievedAt: "2026-08-26T08:30:00.000Z",
      },
      freshness: {
        score: 0.9,
      },
      provenance: {
        sources: [
          {
            source: "probe-source",
            retrievedAt: "2026-08-26T08:30:00.000Z",
          },
        ],
        sourceCount: 1,
      },
    };

    const probeAgent: Agent<unknown, { value: string }> = {
      definition: {
        name: "metadata-probe",
        description: "Returns a full agent result",
      },
      execute: async () => agentResult,
    };

    orchestrator.registerAgent(probeAgent);

    const result = await orchestrator.execute(
      {
        agentName: "metadata-probe",
        input: {},
      },
      createContext("orchestrator-metadata-001"),
    );

    expect(result).toEqual({
      agentName: "metadata-probe",
      success: true,
      result: agentResult,
    });
  });

  it("promotes controlled agent errors while preserving the agent result", async () => {
    const orchestrator = new OrchestratorService();
    const agentResult: AgentResult<unknown> = {
      success: false,
      decision: {
        status: "review",
        confidence: {
          score: 0,
        },
        reason: "Probe failed in a controlled way.",
      },
      error: "Controlled probe failure.",
    };

    const probeAgent: Agent<unknown, unknown> = {
      definition: {
        name: "controlled-failure",
        description: "Returns a controlled failure",
      },
      execute: async () => agentResult,
    };

    orchestrator.registerAgent(probeAgent);

    const result = await orchestrator.execute(
      {
        agentName: "controlled-failure",
        input: {},
      },
      createContext("orchestrator-controlled-failure-001"),
    );

    expect(result).toEqual({
      agentName: "controlled-failure",
      success: false,
      result: agentResult,
      error: "Controlled probe failure.",
    });
  });

  it("registers and executes a NewsAgent", async () => {
    const orchestrator = new OrchestratorService();

    orchestrator.registerAgent(new NewsAgent());

    const result = await orchestrator.execute(
      {
        agentName: "news",
        input: {
          topic: "AI internships Bangalore",
        },
      },
      createContext("orchestrator-news-001"),
    );

    expect(result.success).toBe(true);
    expect(result.agentName).toBe("news");
  });

  it("registers and executes a CareerAgent", async () => {
    const orchestrator = new OrchestratorService();

    orchestrator.registerAgent(new CareerAgent());

    const result = await orchestrator.execute(
      {
        agentName: "career",
        input: {
          query: "AI ML internship",
          location: "Bangalore",
          remote: false,
        },
      },
      createContext("orchestrator-career-001"),
    );

    expect(result.success).toBe(true);
    expect(result.agentName).toBe("career");
  });

  it("registers and executes an EventsAgent", async () => {
    const orchestrator = new OrchestratorService();

    orchestrator.registerAgent(new EventsAgent());

    const result = await orchestrator.execute(
      {
        agentName: "events",
        input: {
          query: "AI ML CSE events",
          location: "Bangalore",
        },
      },
      createContext("orchestrator-events-001"),
    );

    expect(result.success).toBe(true);
    expect(result.agentName).toBe("events");
  });

  it("returns a controlled result for an unknown agent", async () => {
    const orchestrator = new OrchestratorService();

    const result = await orchestrator.execute(
      {
        agentName: "unknown",
        input: {},
      },
      createContext("orchestrator-unknown-001"),
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Agent not found.");
  });

  it("returns a controlled result when an agent throws an exception", async () => {
    const orchestrator = new OrchestratorService();

    const throwingAgent: Agent<unknown, unknown> = {
      definition: { name: "throwing", description: "Throws an error" },
      execute: async () => {
        throw new Error("Unexpected error");
      },
    };

    orchestrator.registerAgent(throwingAgent);

    const result = await orchestrator.execute(
      {
        agentName: "throwing",
        input: {},
      },
      createContext("orchestrator-throwing-001"),
    );

    expect(result.success).toBe(false);
    expect(result.agentName).toBe("throwing");
    expect(result.result).toBeNull();
    expect(result.error).toBe("Agent execution failed.");
  });

  it("returns a controlled result when an agent returns a malformed contract", async () => {
    const orchestrator = new OrchestratorService();

    const malformedAgent = {
      definition: { name: "malformed", description: "Returns invalid data" },
      execute: async () => {
        return {
          success: true,
          // Missing data for a success
          // Missing decision
        } as any;
      },
    } as Agent<unknown, unknown>;

    orchestrator.registerAgent(malformedAgent);

    const result = await orchestrator.execute(
      {
        agentName: "malformed",
        input: {},
      },
      createContext("orchestrator-malformed-001"),
    );

    expect(result.success).toBe(false);
    expect(result.agentName).toBe("malformed");
    expect(result.result).toBeNull();
    expect(result.error).toBe("Agent returned invalid result contract.");
  });

  it("preserves unknown keys on the agent result without stripping them", async () => {
    const orchestrator = new OrchestratorService();

    const agentWithExtraData = {
      definition: { name: "extra-keys", description: "Returns extra keys" },
      execute: async () => {
        return {
          success: true,
          data: { ok: true },
          decision: {
            status: "accept",
            confidence: { score: 1, extraConfidenceProp: "preserved" },
            reason: "test",
            extraDecisionProp: "preserved",
          },
          source: {
            source: "test-source",
            retrievedAt: "2026-08-26T08:30:00.000Z",
            extraSourceProp: "preserved",
          },
          extraRootProp: "preserved",
        } as any;
      },
    } as Agent<unknown, unknown>;

    orchestrator.registerAgent(agentWithExtraData);

    const result = await orchestrator.execute(
      {
        agentName: "extra-keys",
        input: {},
      },
      createContext("orchestrator-extra-001"),
    );

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    const resObj = result.result as any;
    expect(resObj.extraRootProp).toBe("preserved");
    expect(resObj.decision.extraDecisionProp).toBe("preserved");
    expect(resObj.decision.confidence.extraConfidenceProp).toBe("preserved");
    expect(resObj.source.extraSourceProp).toBe("preserved");
  });
});
