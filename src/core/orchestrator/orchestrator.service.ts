import type { Agent } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import type {
  Orchestrator,
  OrchestratorRequest,
  OrchestratorResult,
} from "../../types/orchestrator.js";

export class OrchestratorService implements Orchestrator {
  private readonly agents = new Map<string, Agent<unknown, unknown>>();

  registerAgent<TInput, TOutput>(
    agent: Agent<TInput, TOutput>,
  ): void {
    this.agents.set(
      agent.definition.name,
      agent as unknown as Agent<unknown, unknown>,
    );
  }

  async execute(
    request: OrchestratorRequest,
    context: AgentContext,
  ): Promise<OrchestratorResult> {
    const agent = this.agents.get(request.agentName);

    if (agent === undefined) {
      return {
        agentName: request.agentName,
        success: false,
        result: null,
        error: "Agent not found.",
      };
    }

    try {
      const result = await agent.execute(request.input, context);

      return {
        agentName: request.agentName,
        success: result.success,
        result,
        ...(result.error !== undefined && {
          error: result.error,
        }),
      };
    } catch (error) {
      return {
        agentName: request.agentName,
        success: false,
        result: null,
        error: "Agent execution failed.",
      };
    }
  }
}