import type { ConfidenceMetadata } from "./metadata.js";
import type { PermissionLevel } from "./permissions.js";

/**
 * Input to the Planner.
 * Correlates a user intent with a request identity and permission boundary.
 */
export interface PlannerInput {
  readonly requestId: string;
  readonly intent: string;
  readonly permission: PermissionLevel;
}

/**
 * A single step within an execution plan.
 * Each step targets exactly one registered agent via `agentName`
 * and carries the agent-specific input payload.
 *
 * Steps declare their ordering constraints via `dependsOn`,
 * which references other step IDs that must complete before
 * this step can be dispatched.
 */
export interface PlanStep {
  readonly stepId: string;
  readonly agentName: string;
  readonly input: unknown;
  readonly requiredPermission: PermissionLevel;
  readonly dependsOn: readonly string[];
  readonly description: string;
}

/**
 * The complete execution plan produced by the Planner.
 *
 * An ExecutionPlan is:
 * - Explicit: every step, dependency, and permission is declared.
 * - Deterministic: the same input always produces the same plan.
 * - Serializable: safe for JSON roundtrip.
 * - Validatable: can be verified against the Zod schema.
 * - Model-agnostic: contains no LLM-specific concepts.
 *
 * The plan is NOT executed by the Planner.
 * It is handed to the existing Orchestrator for future dispatch.
 */
export interface ExecutionPlan {
  readonly planId: string;
  readonly requestId: string;
  readonly steps: readonly PlanStep[];
  readonly confidence?: ConfidenceMetadata;
  readonly createdAt: string;
}

/**
 * The Planner contract.
 *
 * Transforms a validated PlannerInput into a validated ExecutionPlan.
 * The Planner:
 * - Does NOT execute agents or tools.
 * - Does NOT call any LLM.
 * - Does NOT perform autonomous execution.
 * - Does NOT write to memory or persistent storage.
 */
export interface Planner {
  plan(input: PlannerInput): ExecutionPlan;
}
