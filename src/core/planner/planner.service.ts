import { hasPermission } from "../../types/permissions.js";
import type {
  ExecutionPlan,
  Planner,
  PlannerInput,
  PlanStep,
} from "../../types/planner.js";
import {
  ExecutionPlanSchema,
  PlannerInputSchema,
} from "./planner.schema.js";

/**
 * Configuration for the PlannerService.
 *
 * `knownAgents` is the set of agent names that the planner
 * considers valid targets. Steps targeting agents outside
 * this set will be rejected during validation.
 */
export interface PlannerServiceConfig {
  readonly knownAgents: ReadonlySet<string>;
}

/**
 * Deterministic, dependency-free Planner implementation.
 *
 * Validates a PlannerInput and a set of externally-provided steps
 * into a validated ExecutionPlan. This service:
 *
 * - Does NOT generate steps from natural language (future-phase concern).
 * - Does NOT execute the resulting plan.
 * - Does NOT call any LLM or external service.
 * - Does NOT access memory, tools, or agents.
 * - Is synchronous — no I/O.
 */
export class PlannerService implements Planner {
  private readonly knownAgents: ReadonlySet<string>;

  constructor(config: PlannerServiceConfig) {
    this.knownAgents = config.knownAgents;
  }

  /**
   * Validates input and steps, then produces an ExecutionPlan.
   *
   * @param input - The validated planner input.
   * @returns A validated ExecutionPlan.
   * @throws Error if the input, steps, or plan fail validation.
   */
  plan(input: PlannerInput): ExecutionPlan {
    const parsedInput = PlannerInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new Error(
        `PlannerInput validation failed: ${parsedInput.error.issues.map((i) => i.message).join("; ")}`,
      );
    }

    return this.buildPlan(parsedInput.data as PlannerInput);
  }

  /**
   * Builds and validates an ExecutionPlan from validated input.
   *
   * This method constructs the plan from the input's steps,
   * validates agent targets and permission boundaries, then
   * validates the complete plan via the ExecutionPlanSchema.
   */
  private buildPlan(input: PlannerInput): ExecutionPlan {
    const rawSteps = (input as PlannerInput & { readonly steps?: readonly PlanStep[] }).steps;

    if (rawSteps === undefined || rawSteps.length === 0) {
      throw new Error(
        "PlannerInput must include at least one step.",
      );
    }

    // Validate agent targets
    for (const step of rawSteps) {
      if (!this.knownAgents.has(step.agentName)) {
        throw new Error(
          `Unknown agent target: "${step.agentName}". Known agents: ${[...this.knownAgents].join(", ")}.`,
        );
      }
    }

    // Validate permission boundaries
    for (const step of rawSteps) {
      if (!hasPermission(input.permission, step.requiredPermission)) {
        throw new Error(
          `Step "${step.stepId}" requires "${step.requiredPermission}" permission, but the plan only has "${input.permission}" permission.`,
        );
      }
    }

    const plan: ExecutionPlan = {
      planId: `plan-${input.requestId}`,
      requestId: input.requestId,
      steps: rawSteps,
      createdAt: new Date().toISOString(),
    };

    const parsedPlan = ExecutionPlanSchema.safeParse(plan);

    if (!parsedPlan.success) {
      throw new Error(
        `ExecutionPlan validation failed: ${parsedPlan.error.issues.map((i) => i.message).join("; ")}`,
      );
    }

    return parsedPlan.data as unknown as ExecutionPlan;
  }
}
