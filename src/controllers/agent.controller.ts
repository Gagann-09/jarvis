import type { Request, Response } from "express";
import { createRuntime } from "../core/runtime/runtime.js";
import type { OrchestratorResult } from "../types/orchestrator.js";
import { AgentRequestSchema } from "./agent.schema.js";

const runtime = createRuntime();

export interface AgentHttpResponse {
  readonly success: boolean;
  readonly agentName?: string;
  readonly result?: OrchestratorResult["result"];
  readonly error?: string;
  readonly details?: readonly unknown[];
}

const createRequestId = (): string =>
  `http-${Date.now()}-${crypto.randomUUID()}`;

export const executeAgent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.body as
    | {
        agentName?: unknown;
        input?: unknown;
        permission?: unknown;
      }
    | undefined;

  if (
    body === undefined ||
    typeof body.agentName !== "string" ||
    body.agentName.trim() === ""
  ) {
    res.status(400).json({
      success: false,
      error: "agentName is required.",
    } satisfies AgentHttpResponse);

    return;
  }

  const agentName = body.agentName;
  const rawInput = body.input ?? {};
  const rawPermission = body.permission;

  let permission: "read" | "prepare" | "execute" | undefined;

  if (rawPermission !== undefined) {
    if (
      rawPermission !== "read" &&
      rawPermission !== "prepare" &&
      rawPermission !== "execute"
    ) {
      res.status(400).json({
        success: false,
        error: "Invalid permission level.",
      } satisfies AgentHttpResponse);
      return;
    }
    permission = rawPermission as "read" | "prepare" | "execute";
  }

  if (
    agentName === "news" ||
    agentName === "career" ||
    agentName === "events"
  ) {
    const parsed = AgentRequestSchema.safeParse({
      agentName,
      input: rawInput,
    });

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid agent request.",
        details: parsed.error.issues,
      } satisfies AgentHttpResponse);

      return;
    }

    try {
      const result = await runtime.orchestrator.execute(
        parsed.data,
        await runtime.createContext(createRequestId(), permission),
      );

      if (result.success) {
        res.status(200).json(result satisfies OrchestratorResult);
        return;
      }

      if (result.result === null) {
        if (result.error === "Agent not found.") {
          res.status(404).json(result satisfies OrchestratorResult);
        } else if (result.error === "Agent returned invalid result contract.") {
          res.status(502).json(result satisfies OrchestratorResult);
        } else {
          res.status(500).json(result satisfies OrchestratorResult);
        }
        return;
      }

      res.status(502).json(result satisfies OrchestratorResult);
    } catch {
      res.status(500).json({
        success: false,
        error: "Agent execution failed.",
      } satisfies AgentHttpResponse);
    }

    return;
  }

  try {
    const result = await runtime.orchestrator.execute(
      {
        agentName,
        input: rawInput,
      },
      await runtime.createContext(createRequestId(), permission),
    );

    if (result.success) {
      res.status(200).json(result satisfies OrchestratorResult);
      return;
    }

    if (result.result === null) {
      if (result.error === "Agent not found.") {
        res.status(404).json(result satisfies OrchestratorResult);
      } else if (result.error === "Agent returned invalid result contract.") {
        res.status(502).json(result satisfies OrchestratorResult);
      } else {
        res.status(500).json(result satisfies OrchestratorResult);
      }
      return;
    }

    res.status(502).json(result satisfies OrchestratorResult);
  } catch {
    res.status(500).json({
      success: false,
      error: "Agent execution failed.",
    } satisfies AgentHttpResponse);
  }
};