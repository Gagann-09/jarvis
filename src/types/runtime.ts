import type { AgentContext } from "./agent-context.js";
import type { Orchestrator } from "./orchestrator.js";
import type { PermissionLevel } from "./permissions.js";

export interface Runtime {
  readonly orchestrator: Orchestrator;

  createContext(
    requestId: string,
    permission?: PermissionLevel,
  ): AgentContext;
}