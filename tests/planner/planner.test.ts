import { describe, expect, it } from "vitest";
import { PlannerService } from "../../src/core/planner/planner.service.js";
import {
  ExecutionPlanSchema,
  PlannerInputSchema,
  PlanStepSchema,
} from "../../src/core/planner/planner.schema.js";
import type {
  ExecutionPlan,
  PlannerInput,
  PlanStep,
} from "../../src/types/planner.js";

const KNOWN_AGENTS = new Set(["news", "career", "events"]);

const createPlanner = () =>
  new PlannerService({ knownAgents: KNOWN_AGENTS });

const minimalInput = (
  overrides?: Partial<PlannerInput> & { steps?: readonly PlanStep[] },
): PlannerInput & { readonly steps: readonly PlanStep[] } => ({
  requestId: "req-001",
  intent: "Find AI news",
  permission: "read" as const,
  steps: [
    {
      stepId: "step-1",
      agentName: "news",
      input: { topic: "AI" },
      requiredPermission: "read" as const,
      dependsOn: [],
      description: "Search for AI news.",
    },
  ],
  ...overrides,
});

describe("Planner contract", () => {
  // --- 1. Valid minimal plan ---
  it("produces a valid minimal single-step plan", () => {
    const planner = createPlanner();
    const plan = planner.plan(minimalInput());

    expect(plan.planId).toBe("plan-req-001");
    expect(plan.requestId).toBe("req-001");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.agentName).toBe("news");
    expect(plan.createdAt).toBeTruthy();
  });

  // --- 2. Valid multi-step plan with dependencies ---
  it("produces a valid multi-step plan with dependencies", () => {
    const planner = createPlanner();
    const plan = planner.plan(
      minimalInput({
        requestId: "req-multi-001",
        intent: "Find news and career opportunities",
        steps: [
          {
            stepId: "step-1",
            agentName: "news",
            input: { topic: "AI" },
            requiredPermission: "read",
            dependsOn: [],
            description: "Search for AI news.",
          },
          {
            stepId: "step-2",
            agentName: "career",
            input: { query: "AI ML internship" },
            requiredPermission: "read",
            dependsOn: ["step-1"],
            description: "Search for career opportunities based on news.",
          },
          {
            stepId: "step-3",
            agentName: "events",
            input: { query: "AI events" },
            requiredPermission: "read",
            dependsOn: ["step-1"],
            description: "Find events related to the news topic.",
          },
        ],
      }),
    );

    expect(plan.planId).toBe("plan-req-multi-001");
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[1]!.dependsOn).toEqual(["step-1"]);
    expect(plan.steps[2]!.dependsOn).toEqual(["step-1"]);
  });

  // --- 3. Deterministic ordering via dependsOn ---
  it("preserves step ordering and dependency declarations", () => {
    const planner = createPlanner();
    const plan = planner.plan(
      minimalInput({
        steps: [
          {
            stepId: "alpha",
            agentName: "news",
            input: { topic: "first" },
            requiredPermission: "read",
            dependsOn: [],
            description: "First step.",
          },
          {
            stepId: "beta",
            agentName: "career",
            input: { query: "second" },
            requiredPermission: "read",
            dependsOn: ["alpha"],
            description: "Second step, depends on alpha.",
          },
        ],
      }),
    );

    expect(plan.steps[0]!.stepId).toBe("alpha");
    expect(plan.steps[1]!.stepId).toBe("beta");
    expect(plan.steps[1]!.dependsOn).toEqual(["alpha"]);
  });

  // --- 4. Invalid/missing required fields on PlannerInput ---
  it("rejects PlannerInput with missing requestId", () => {
    const parsed = PlannerInputSchema.safeParse({
      intent: "Find news",
      permission: "read",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects PlannerInput with empty intent", () => {
    const parsed = PlannerInputSchema.safeParse({
      requestId: "req-001",
      intent: "   ",
      permission: "read",
    });

    expect(parsed.success).toBe(false);
  });

  // --- 5. Invalid/missing required fields on PlanStep ---
  it("rejects PlanStep with missing stepId", () => {
    const parsed = PlanStepSchema.safeParse({
      agentName: "news",
      input: {},
      requiredPermission: "read",
      dependsOn: [],
      description: "A step.",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects PlanStep with empty description", () => {
    const parsed = PlanStepSchema.safeParse({
      stepId: "step-1",
      agentName: "news",
      input: {},
      requiredPermission: "read",
      dependsOn: [],
      description: "",
    });

    expect(parsed.success).toBe(false);
  });

  // --- 6. Invalid permission value ---
  it("rejects invalid permission on PlannerInput", () => {
    const parsed = PlannerInputSchema.safeParse({
      requestId: "req-001",
      intent: "Find news",
      permission: "admin",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid requiredPermission on PlanStep", () => {
    const parsed = PlanStepSchema.safeParse({
      stepId: "step-1",
      agentName: "news",
      input: {},
      requiredPermission: "superuser",
      dependsOn: [],
      description: "A step.",
    });

    expect(parsed.success).toBe(false);
  });

  // --- 7. Invalid/unknown agent target ---
  it("rejects a plan step targeting an unknown agent", () => {
    const planner = createPlanner();

    expect(() =>
      planner.plan(
        minimalInput({
          steps: [
            {
              stepId: "step-1",
              agentName: "nonexistent-agent",
              input: {},
              requiredPermission: "read",
              dependsOn: [],
              description: "Unknown agent.",
            },
          ],
        }),
      ),
    ).toThrow('Unknown agent target: "nonexistent-agent"');
  });

  // --- 8. Malformed plan data ---
  it("rejects completely malformed PlannerInput", () => {
    const planner = createPlanner();

    expect(() => planner.plan(null as any)).toThrow(
      "PlannerInput validation failed",
    );
  });

  it("rejects PlannerInput with wrong types", () => {
    const planner = createPlanner();

    expect(() =>
      planner.plan({
        requestId: 123,
        intent: false,
        permission: "read",
      } as any),
    ).toThrow("PlannerInput validation failed");
  });

  // --- 9. Preservation of allowed unknown fields ---
  it("preserves unknown fields on PlannerInput via passthrough", () => {
    const parsed = PlannerInputSchema.safeParse({
      requestId: "req-001",
      intent: "Find news",
      permission: "read",
      customField: "preserved",
    });

    expect(parsed.success).toBe(true);
    expect((parsed.data as any).customField).toBe("preserved");
  });

  it("preserves unknown fields on PlanStep via passthrough", () => {
    const parsed = PlanStepSchema.safeParse({
      stepId: "step-1",
      agentName: "news",
      input: {},
      requiredPermission: "read",
      dependsOn: [],
      description: "A step.",
      extraStepProp: "preserved",
    });

    expect(parsed.success).toBe(true);
    expect((parsed.data as any).extraStepProp).toBe("preserved");
  });

  it("preserves unknown fields on ExecutionPlan via passthrough", () => {
    const parsed = ExecutionPlanSchema.safeParse({
      planId: "plan-001",
      requestId: "req-001",
      steps: [
        {
          stepId: "step-1",
          agentName: "news",
          input: {},
          requiredPermission: "read",
          dependsOn: [],
          description: "A step.",
        },
      ],
      createdAt: new Date().toISOString(),
      extraPlanProp: "preserved",
    });

    expect(parsed.success).toBe(true);
    expect((parsed.data as any).extraPlanProp).toBe("preserved");
  });

  // --- 10. Serialization-safe structure ---
  it("produces a JSON roundtrip-safe plan", () => {
    const planner = createPlanner();
    const plan = planner.plan(minimalInput());
    const roundtripped = JSON.parse(JSON.stringify(plan)) as ExecutionPlan;

    expect(roundtripped).toEqual(plan);
    expect(roundtripped.planId).toBe(plan.planId);
    expect(roundtripped.steps).toHaveLength(plan.steps.length);
    expect(roundtripped.steps[0]!.stepId).toBe(plan.steps[0]!.stepId);
  });

  // --- 11. Rejection of self-referencing dependsOn ---
  it("rejects a step that depends on itself", () => {
    const parsed = ExecutionPlanSchema.safeParse({
      planId: "plan-001",
      requestId: "req-001",
      steps: [
        {
          stepId: "step-1",
          agentName: "news",
          input: {},
          requiredPermission: "read",
          dependsOn: ["step-1"],
          description: "Self-referencing step.",
        },
      ],
      createdAt: new Date().toISOString(),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "ExecutionPlan contains a step that depends on itself.",
      );
    }
  });

  // --- 12. Rejection of dangling dependsOn references ---
  it("rejects a plan with dangling dependsOn references", () => {
    const parsed = ExecutionPlanSchema.safeParse({
      planId: "plan-001",
      requestId: "req-001",
      steps: [
        {
          stepId: "step-1",
          agentName: "news",
          input: {},
          requiredPermission: "read",
          dependsOn: ["nonexistent-step"],
          description: "Dangling dependency.",
        },
      ],
      createdAt: new Date().toISOString(),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "ExecutionPlan contains dependsOn references to non-existent stepIds.",
      );
    }
  });

  // --- 13. Rejection of empty steps array ---
  it("rejects an execution plan with no steps", () => {
    const parsed = ExecutionPlanSchema.safeParse({
      planId: "plan-001",
      requestId: "req-001",
      steps: [],
      createdAt: new Date().toISOString(),
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects PlannerInput with no steps via the service", () => {
    const planner = createPlanner();

    expect(() =>
      planner.plan({
        requestId: "req-001",
        intent: "Find news",
        permission: "read",
      } as any),
    ).toThrow("PlannerInput must include at least one step.");
  });

  // --- 14. Rejection of duplicate stepIds ---
  it("rejects a plan with duplicate stepIds", () => {
    const parsed = ExecutionPlanSchema.safeParse({
      planId: "plan-001",
      requestId: "req-001",
      steps: [
        {
          stepId: "step-1",
          agentName: "news",
          input: {},
          requiredPermission: "read",
          dependsOn: [],
          description: "First.",
        },
        {
          stepId: "step-1",
          agentName: "career",
          input: {},
          requiredPermission: "read",
          dependsOn: [],
          description: "Duplicate.",
        },
      ],
      createdAt: new Date().toISOString(),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "ExecutionPlan contains duplicate stepId values.",
      );
    }
  });

  // --- 15. Permission escalation rejection ---
  it("rejects a step that requires more permission than the plan allows", () => {
    const planner = createPlanner();

    expect(() =>
      planner.plan(
        minimalInput({
          permission: "read",
          steps: [
            {
              stepId: "step-1",
              agentName: "news",
              input: { topic: "AI" },
              requiredPermission: "execute",
              dependsOn: [],
              description: "Requires execute but plan only has read.",
            },
          ],
        }),
      ),
    ).toThrow(
      'Step "step-1" requires "execute" permission, but the plan only has "read" permission.',
    );
  });

  it("allows a step that requires less permission than the plan allows", () => {
    const planner = createPlanner();
    const plan = planner.plan(
      minimalInput({
        permission: "execute",
        steps: [
          {
            stepId: "step-1",
            agentName: "news",
            input: { topic: "AI" },
            requiredPermission: "read",
            dependsOn: [],
            description: "Requires read, plan has execute.",
          },
        ],
      }),
    );

    expect(plan.steps).toHaveLength(1);
  });
});
