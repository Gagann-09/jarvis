import type {
  ConfidenceMetadata,
  FreshnessMetadata,
  SourceMetadata,
} from "./metadata.js";
import type { PermissionLevel } from "./permissions.js";

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly permission: PermissionLevel;
}

export interface ToolExecutionContext {
  readonly requestId: string;
  readonly permission: PermissionLevel;
}

export interface ToolResult<TOutput> {
  readonly success: boolean;
  readonly data?: TOutput;
  readonly error?: string;
  readonly source?: SourceMetadata;
  readonly freshness?: FreshnessMetadata;
  readonly confidence?: ConfidenceMetadata;
}

export interface Tool<TInput, TOutput> {
  readonly definition: ToolDefinition;

  execute(
    input: TInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<TOutput>>;
}

export interface ToolCapability<TInput, TOutput> {
  readonly definition: ToolDefinition;

  execute(
    input: TInput,
    context: ToolExecutionContext,
  ): Promise<ToolResult<TOutput>>;
}