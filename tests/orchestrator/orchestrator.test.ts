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

  describe("executePlan", () => {
    it("executes a single successful step", async () => {
      const orchestrator = new OrchestratorService();
      orchestrator.registerAgent(new CareerAgent());
      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-1",
        requestId: "req-1",
        createdAt: new Date().toISOString(),
        steps: [
          {
            stepId: "step-1",
            agentName: "career",
            input: { query: "AI ML internship", location: "Bangalore", remote: false },
            requiredPermission: "read",
            dependsOn: [],
            description: "Find jobs",
          }
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-1"));

      expect(result.success).toBe(true);
      expect(result.planId).toBe("plan-1");
      expect(result.stepResults).toHaveLength(1);
      expect(result.stepResults[0].status).toBe("success");
      expect(result.stepResults[0].agentName).toBe("career");
    });

    it("executes multiple independent successful steps in deterministic order", async () => {
      const orchestrator = new OrchestratorService();
      const executionOrder: string[] = [];
      const createAgent = (name: string) => ({
        definition: { name, description: "Test agent" },
        execute: async () => {
          executionOrder.push(name);
          return { success: true, data: {}, decision: { status: "accept", confidence: { score: 1 }, reason: "" } };
        }
      } as Agent<unknown, unknown>);

      orchestrator.registerAgent(createAgent("agentA"));
      orchestrator.registerAgent(createAgent("agentB"));

      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-2",
        requestId: "req-2",
        createdAt: new Date().toISOString(),
        steps: [
          {
            stepId: "step-A",
            agentName: "agentA",
            input: {},
            requiredPermission: "read",
            dependsOn: [],
            description: "Step A",
          },
          {
            stepId: "step-B",
            agentName: "agentB",
            input: {},
            requiredPermission: "read",
            dependsOn: [],
            description: "Step B",
          }
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-2"));
      expect(result.success).toBe(true);
      expect(executionOrder).toEqual(["agentA", "agentB"]);
    });

    it("respects dependency ordering", async () => {
      const orchestrator = new OrchestratorService();
      const executionOrder: string[] = [];
      const createAgent = (name: string) => ({
        definition: { name, description: "Test agent" },
        execute: async () => {
          executionOrder.push(name);
          return { success: true, data: {}, decision: { status: "accept", confidence: { score: 1 }, reason: "" } };
        }
      } as Agent<unknown, unknown>);

      orchestrator.registerAgent(createAgent("agentA"));
      orchestrator.registerAgent(createAgent("agentB"));

      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-3",
        requestId: "req-3",
        createdAt: new Date().toISOString(),
        steps: [
          {
            stepId: "step-B",
            agentName: "agentB",
            input: {},
            requiredPermission: "read",
            dependsOn: ["step-A"],
            description: "Step B",
          },
          {
            stepId: "step-A",
            agentName: "agentA",
            input: {},
            requiredPermission: "read",
            dependsOn: [],
            description: "Step A",
          }
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-3"));
      expect(result.success).toBe(true);
      expect(executionOrder).toEqual(["agentA", "agentB"]);
      expect(result.stepResults[0].stepId).toBe("step-A");
      expect(result.stepResults[1].stepId).toBe("step-B");
    });

    it("skips dependent steps if dependency fails", async () => {
      const orchestrator = new OrchestratorService();
      const createAgent = (name: string, success: boolean) => ({
        definition: { name, description: "Test agent" },
        execute: async () => {
          if (!success) {
             return { success: false, error: "Failed", decision: { status: "reject", confidence: { score: 1 }, reason: "" } };
          }
          return { success: true, data: {}, decision: { status: "accept", confidence: { score: 1 }, reason: "" } };
        }
      } as Agent<unknown, unknown>);

      orchestrator.registerAgent(createAgent("failAgent", false));
      orchestrator.registerAgent(createAgent("successAgent", true));

      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-4",
        requestId: "req-4",
        createdAt: new Date().toISOString(),
        steps: [
          {
            stepId: "step-A",
            agentName: "failAgent",
            input: {},
            requiredPermission: "read",
            dependsOn: [],
            description: "Step A",
          },
          {
            stepId: "step-B",
            agentName: "successAgent",
            input: {},
            requiredPermission: "read",
            dependsOn: ["step-A"],
            description: "Step B",
          }
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-4"));
      expect(result.success).toBe(false);
      expect(result.stepResults[0].status).toBe("failed");
      expect(result.stepResults[1].status).toBe("skipped");
      expect(result.stepResults[1].error).toBe("Dependency failed.");
    });

    it("skips downstream steps if intermediate dependency is skipped", async () => {
      const orchestrator = new OrchestratorService();
      const createAgent = (name: string, success: boolean) => ({
        definition: { name, description: "Test agent" },
        execute: async () => {
          if (!success) {
             return { success: false, error: "Failed", decision: { status: "reject", confidence: { score: 1 }, reason: "" } };
          }
          return { success: true, data: {}, decision: { status: "accept", confidence: { score: 1 }, reason: "" } };
        }
      } as Agent<unknown, unknown>);

      orchestrator.registerAgent(createAgent("failAgent", false));
      orchestrator.registerAgent(createAgent("successAgent", true));

      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-5",
        requestId: "req-5",
        createdAt: new Date().toISOString(),
        steps: [
          { stepId: "step-A", agentName: "failAgent", input: {}, requiredPermission: "read", dependsOn: [], description: "" },
          { stepId: "step-B", agentName: "successAgent", input: {}, requiredPermission: "read", dependsOn: ["step-A"], description: "" },
          { stepId: "step-C", agentName: "successAgent", input: {}, requiredPermission: "read", dependsOn: ["step-B"], description: "" }
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-5"));
      expect(result.success).toBe(false);
      expect(result.stepResults[0].status).toBe("failed");
      expect(result.stepResults[1].status).toBe("skipped");
      expect(result.stepResults[1].error).toBe("Dependency failed.");
      expect(result.stepResults[2].status).toBe("skipped");
      expect(result.stepResults[2].error).toBe("Dependency skipped.");
    });

    it("continues independent branch after another branch fails", async () => {
      const orchestrator = new OrchestratorService();
      let cExecuted = false;
      const createAgent = (name: string, success: boolean) => ({
        definition: { name, description: "Test agent" },
        execute: async () => {
          if (name === "agentC") cExecuted = true;
          if (!success) {
             return { success: false, error: "Failed", decision: { status: "reject", confidence: { score: 1 }, reason: "" } };
          }
          return { success: true, data: {}, decision: { status: "accept", confidence: { score: 1 }, reason: "" } };
        }
      } as Agent<unknown, unknown>);

      orchestrator.registerAgent(createAgent("failAgent", false));
      orchestrator.registerAgent(createAgent("agentC", true));

      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-6",
        requestId: "req-6",
        createdAt: new Date().toISOString(),
        steps: [
          { stepId: "step-A", agentName: "failAgent", input: {}, requiredPermission: "read", dependsOn: [], description: "" },
          { stepId: "step-B", agentName: "agentC", input: {}, requiredPermission: "read", dependsOn: ["step-A"], description: "" },
          { stepId: "step-C", agentName: "agentC", input: {}, requiredPermission: "read", dependsOn: [], description: "" }
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-6"));
      expect(result.success).toBe(false);
      expect(cExecuted).toBe(true);
      const stepC = result.stepResults.find(s => s.stepId === "step-C");
      expect(stepC?.status).toBe("success");
    });

    it("fails step with insufficient permission", async () => {
      const orchestrator = new OrchestratorService();
      orchestrator.registerAgent({
        definition: { name: "test", description: "" },
        execute: async () => ({ success: true, data: {}, decision: { status: "accept", confidence: { score: 1 }, reason: "" } })
      } as Agent<unknown, unknown>);

      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-7",
        requestId: "req-7",
        createdAt: new Date().toISOString(),
        steps: [
          { stepId: "step-A", agentName: "test", input: {}, requiredPermission: "execute", dependsOn: [], description: "" },
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-7")); // Context has 'read'
      expect(result.success).toBe(false);
      expect(result.stepResults[0].status).toBe("failed");
      expect(result.stepResults[0].error).toBe("Insufficient permission.");
    });

    it("handles unknown runtime agent gracefully", async () => {
      const orchestrator = new OrchestratorService();
      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-8",
        requestId: "req-8",
        createdAt: new Date().toISOString(),
        steps: [
          { stepId: "step-A", agentName: "unknownAgent", input: {}, requiredPermission: "read", dependsOn: [], description: "" },
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-8"));
      expect(result.success).toBe(false);
      expect(result.stepResults[0].status).toBe("failed");
      expect(result.stepResults[0].error).toBe("Agent not found.");
    });

    it("detects and rejects cycles safely", async () => {
      const orchestrator = new OrchestratorService();
      const plan: import("../../src/types/planner.js").ExecutionPlan = {
        planId: "plan-cycle",
        requestId: "req-cycle",
        createdAt: new Date().toISOString(),
        steps: [
          { stepId: "step-A", agentName: "test", input: {}, requiredPermission: "read", dependsOn: ["step-B"], description: "" },
          { stepId: "step-B", agentName: "test", input: {}, requiredPermission: "read", dependsOn: ["step-A"], description: "" },
        ]
      };

      const result = await orchestrator.executePlan(plan, createContext("test-cycle"));
      expect(result.success).toBe(false);
      expect(result.stepResults[0].status).toBe("failed");
      expect(result.stepResults[0].error).toMatch(/cycle/i);
    });
  });
});
