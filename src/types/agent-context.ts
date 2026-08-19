import type { MemoryRecord } from "./memory.js";
import type { PermissionLevel } from "./permissions.js";
import type { ToolCapability } from "./tool.js";
import type {
  SearchInput,
  SearchResult,
} from "../tools/web/search.schema.js";


export interface AgentCapabilities {
  readonly search: ToolCapability<
    SearchInput,
    readonly SearchResult[]
  >;
}

export interface AgentContext {
  readonly requestId: string;
  readonly permission: PermissionLevel;
  readonly relevantMemory: readonly MemoryRecord[];
  readonly capabilities: AgentCapabilities;
}