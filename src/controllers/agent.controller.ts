import type { Request, Response } from "express";
import { createRuntime } from "../core/runtime/runtime.js";

const runtime = createRuntime();

export const executeAgent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { agentName, input } = req.body as {
    agentName?: unknown;
    input?: unknown;
  };

  if (typeof agentName !== "string" || agentName.trim() === "") {
    res.status(400).json({
      success: false,
      error: "agentName is required.",
    });
    return;
  }

  const result = await runtime.orchestrator.execute(
    {
      agentName,
      input: input ?? {},
    },
    runtime.createContext(
      `http-${Date.now()}`,
    ),
  );

  res
    .status(result.success ? 200 : 404)
    .json(result);
};