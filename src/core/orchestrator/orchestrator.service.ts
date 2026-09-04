import type { Agent } from "../../types/agent.js";
import type { AgentContext } from "../../types/agent-context.js";
import type {
  Orchestrator,
  OrchestratorRequest,
  OrchestratorResult,
  PlanExecutionResult,
  StepExecutionResult,
} from "../../types/orchestrator.js";
import type { ExecutionPlan, PlanStep } from "../../types/planner.js";
import { hasPermission } from "../../types/permissions.js";
import { AgentResultSchema } from "./agent-result.schema.js";

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
      const rawResult = await agent.execute(request.input, context);

      const parsed = AgentResultSchema.safeParse(rawResult);

      if (!parsed.success) {
        return {
          agentName: request.agentName,
          success: false,
          result: null,
          error: "Agent returned invalid result contract.",
        };
      }

      const result = parsed.data as import("../../types/agent.js").AgentResult<unknown>;

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

  async executePlan(
    plan: ExecutionPlan,
    context: AgentContext,
  ): Promise<PlanExecutionResult> {
    const stepsMap = new Map<string, PlanStep>();
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const step of plan.steps) {
      stepsMap.set(step.stepId, step);
      inDegree.set(step.stepId, 0);
      adj.set(step.stepId, []);
    }

    for (const step of plan.steps) {
      for (const dep of step.dependsOn) {
        if (!stepsMap.has(dep)) {
          continue;
        }
        inDegree.set(step.stepId, (inDegree.get(step.stepId) || 0) + 1);
        adj.get(dep)!.push(step.stepId);
      }
    }

    const sortedSteps: PlanStep[] = [];
    const visited = new Set<string>();

    let added = true;
    while (added && sortedSteps.length < plan.steps.length) {
      added = false;
      for (const step of plan.steps) {
        if (!visited.has(step.stepId) && inDegree.get(step.stepId) === 0) {
          visited.add(step.stepId);
          sortedSteps.push(step);
          for (const next of adj.get(step.stepId)!) {
            inDegree.set(next, inDegree.get(next)! - 1);
          }
          added = true;
          break;
        }
      }
    }

    if (sortedSteps.length < plan.steps.length) {
      return {
        planId: plan.planId,
        success: false,
        stepResults: plan.steps.map(step => ({
          stepId: step.stepId,
          agentName: step.agentName,
          status: "failed",
          error: "Cycle detected in execution plan.",
        })),
      };
    }

    const stepResults: StepExecutionResult[] = [];
    const stepStatusMap = new Map<string, "success" | "failed" | "skipped">();
    let allSuccess = true;

    for (const step of sortedSteps) {
      let skipReason: string | null = null;
      for (const depId of step.dependsOn) {
        const depStatus = stepStatusMap.get(depId);
        if (depStatus === "failed" || depStatus === undefined) {
          skipReason = "Dependency failed.";
          break;
        } else if (depStatus === "skipped") {
          skipReason = skipReason || "Dependency skipped.";
        }
      }

      if (skipReason !== null) {
        stepResults.push({
          stepId: step.stepId,
          agentName: step.agentName,
          status: "skipped",
          error: skipReason,
        });
        stepStatusMap.set(step.stepId, "skipped");
        allSuccess = false;
        continue;
      }

      if (!hasPermission(context.permission, step.requiredPermission)) {
        stepResults.push({
          stepId: step.stepId,
          agentName: step.agentName,
          status: "failed",
          error: "Insufficient permission.",
        });
        stepStatusMap.set(step.stepId, "failed");
        allSuccess = false;
        continue;
      }

      const executionResult = await this.execute(
        {
          agentName: step.agentName,
          input: step.input,
        },
        context,
      );

      const status = executionResult.success ? "success" : "failed";
      if (!executionResult.success) {
        allSuccess = false;
      }

      const result: StepExecutionResult = {
        stepId: step.stepId,
        agentName: step.agentName,
        status,
        ...(executionResult.result !== null && { result: executionResult.result }),
        ...(executionResult.error !== undefined && { error: executionResult.error }),
      };

      stepResults.push(result);
      stepStatusMap.set(step.stepId, status);
    }

    return {
      planId: plan.planId,
      success: allSuccess,
      stepResults,
    };
  }
}