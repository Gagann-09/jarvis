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

describe("Agent controller contract", () => {
  it("rejects an undefined request body", async () => {
    const req = {
      body: undefined,
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "agentName is required.",
    });
  });

  it("rejects a request without agentName", async () => {
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

  it("returns controlled response for an unknown agent", async () => {
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

  it("rejects news without topic", async () => {
    const req = {
      body: {
        agentName: "news",
        input: {},
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: "Invalid agent request.",
    });
  });

  it("rejects career without query", async () => {
    const req = {
      body: {
        agentName: "career",
        input: {},
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: "Invalid agent request.",
    });
  });

  it("rejects events without query", async () => {
    const req = {
      body: {
        agentName: "events",
        input: {},
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: "Invalid agent request.",
    });
  });

  it("rejects whitespace news topics", async () => {
    const req = {
      body: {
        agentName: "news",
        input: {
          topic: "   ",
        },
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: "Invalid agent request.",
    });
  });

  it("rejects invalid career remote values", async () => {
    const req = {
      body: {
        agentName: "career",
        input: {
          query: "AI internship",
          remote: "yes",
        },
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: "Invalid agent request.",
    });
  });

  it("rejects invalid events date values", async () => {
    const req = {
      body: {
        agentName: "events",
        input: {
          query: "AI events",
          startDate: 123,
        },
      },
    } as Request;

    const res = createResponse();

    await executeAgent(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: "Invalid agent request.",
    });
  });
});