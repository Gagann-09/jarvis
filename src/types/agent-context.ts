import type { MemoryRecord } from "./memory.js";
import type { PermissionLevel } from "./permissions.js";
import type { ToolCapability } from "./tool.js";
import type {
  SearchInput,
  SearchResult,
} from "../tools/web/search.schema.js";
import type {
  CareerOpportunity,
  CareerSearchInput,
} from "../tools/web/career.schema.js";
import type {
  Event,
  EventsSearchInput,
} from "../tools/web/events.schema.js";

export interface AgentCapabilities {
  readonly search: ToolCapability<
    SearchInput,
    readonly SearchResult[]
  >;

  readonly career: ToolCapability<
    CareerSearchInput,
    readonly CareerOpportunity[]
  >;

  readonly events: ToolCapability<
    EventsSearchInput,
    readonly Event[]
  >;
}

export interface AgentContext {
  readonly requestId: string;
  readonly permission: PermissionLevel;
  readonly relevantMemory: readonly MemoryRecord[];
  readonly capabilities: AgentCapabilities;
}