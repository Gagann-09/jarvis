import type {
  AgentCapabilities,
  AgentContext,
} from "../../types/agent-context.js";
import type { MemoryRecord } from "../../types/memory.js";
import type { PermissionLevel } from "../../types/permissions.js";

interface AgentContextServiceOptions {
  readonly requestId: string;
  readonly permission: PermissionLevel;
  readonly capabilities: AgentCapabilities;
  readonly relevantMemory?: readonly MemoryRecord[];
}

export class AgentContextService implements AgentContext {
  readonly requestId: string;
  readonly permission: PermissionLevel;
  readonly relevantMemory: readonly MemoryRecord[];
  readonly capabilities: AgentCapabilities;

  constructor(options: AgentContextServiceOptions) {
    this.requestId = options.requestId;
    this.permission = options.permission;
    this.capabilities = options.capabilities;
    this.relevantMemory = options.relevantMemory ?? [];
  }
}