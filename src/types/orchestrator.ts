import type { Agent, AgentResult } from "./agent.js";
import type { AgentContext } from "./agent-context.js";

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

export interface Orchestrator {
  execute(
    request: OrchestratorRequest,
    context: AgentContext,
  ): Promise<OrchestratorResult>;

  registerAgent<TInput, TOutput>(
    agent: Agent<TInput, TOutput>,
  ): void;
}
