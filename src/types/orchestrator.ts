import type { Agent, AgentResult } from "./agent.js";
import type { AgentContext } from "./agent-context.js";
import type { ExecutionPlan } from "./planner.js";

export interface OrchestratorRequest {
  readonly agentName: string;
  readonly input: unknown;
}

export interface OrchestratorResult {
  readonly agentName: string;
  readonly success: boolean;
  readonly result: AgentResult<unknown> | null;
  readonly error?: string;
}

export interface StepExecutionResult {
  readonly stepId: string;
  readonly agentName: string;
  readonly status: "success" | "failed" | "skipped";
  readonly result?: AgentResult<unknown> | null;
  readonly error?: string;
}

export interface PlanExecutionResult {
  readonly planId: string;
  readonly success: boolean;
  readonly stepResults: readonly StepExecutionResult[];
}

export interface Orchestrator {
  execute(
    request: OrchestratorRequest,
    context: AgentContext,
  ): Promise<OrchestratorResult>;

  executePlan(
    plan: ExecutionPlan,
    context: AgentContext,
  ): Promise<PlanExecutionResult>;

  registerAgent<TInput, TOutput>(
    agent: Agent<TInput, TOutput>,
  ): void;
}
