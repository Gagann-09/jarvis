import type { AgentContext } from "./agent-context.js";
import type { Decision } from "./decision.js";
import type {
  FreshnessMetadata,
  SourceMetadata,
} from "./metadata.js";

export interface AgentDefinition {
  readonly name: string;
  readonly description: string;
}

export interface AgentResult<TOutput> {
  readonly success: boolean;
  readonly data?: TOutput;
  readonly decision: Decision;
  readonly error?: string;
  readonly source?: SourceMetadata;
  readonly freshness?: FreshnessMetadata;
}

export interface Agent<TInput, TOutput> {
  readonly definition: AgentDefinition;

  execute(
    input: TInput,
    context: AgentContext,
  ): Promise<AgentResult<TOutput>>;
}