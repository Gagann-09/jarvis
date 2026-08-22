import { describe, expect, it } from "vitest";
import type { Request, Response } from "express";
import { executeAgent } from "../../src/controllers/agent.controller.js";

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,

    status(code: number) {
      response.statusCode = code;
      return response;
    },

    json(body: unknown) {
      response.body = body;
      return response;
    },
  };

  return response as unknown as Response & {
    statusCode: number;
    body: unknown;
  };
};

describe("Agent controller", () => {
  it("rejects requests without agentName", async () => {
    const req = {
      body: {},
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "agentName is required.",
    });
  });

  it("rejects an empty agentName", async () => {
    const req = {
      body: {
        agentName: "   ",
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "agentName is required.",
    });
  });

  it("returns a controlled response for an unknown agent", async () => {
    const req = {
      body: {
        agentName: "unknown",
        input: {},
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      agentName: "unknown",
      success: false,
      error: "Agent not found.",
    });
  });
});