import type { Request, Response } from "express";
import { createRuntime } from "../core/runtime/runtime.js";
import { AgentRequestSchema } from "./agent.schema.js";

const runtime = createRuntime();

export const executeAgent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.body as
    | {
        agentName?: unknown;
        input?: unknown;
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
    });
    return;
  }

  const agentName = body.agentName;
  const rawInput = body.input ?? {};
  let input: unknown = rawInput;

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
      });
      return;
    }

    input = parsed.data.input;
  }

  try {
    const result = await runtime.orchestrator.execute(
      {
        agentName,
        input,
      },
      runtime.createContext(
        `http-${Date.now()}-${crypto.randomUUID()}`,
      ),
    );

    res.status(result.success ? 200 : 404).json(result);
  } catch {
    res.status(500).json({
      success: false,
      error: "Agent execution failed.",
    });
  }
};