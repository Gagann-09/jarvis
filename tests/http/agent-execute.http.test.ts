import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { request } from "node:http";

/**
 * Mock the runtime so every agent uses the deterministic
 * mock-news-provider instead of hitting GDELT / Google News.
 */
import { vi } from "vitest";

vi.mock("../../src/core/runtime/runtime.js", async () => {
  const { OrchestratorService } = await import(
    "../../src/core/orchestrator/orchestrator.service.js"
  );
  const { NewsAgent } = await import(
    "../../src/agents/news/news.agent.js"
  );
  const { CareerAgent } = await import(
    "../../src/agents/career/career.agent.js"
  );
  const { EventsAgent } = await import(
    "../../src/agents/events/events.agent.js"
  );
  const { createSearchCapability } = await import(
    "../../src/tools/web/search.capability.js"
  );
  const { mockNewsProvider } = await import(
    "../../src/providers/news/mock-news.provider.js"
  );
  const { careerCapability } = await import(
    "../../src/tools/web/career.capability.js"
  );
  const { eventsCapability } = await import(
    "../../src/tools/web/events.capability.js"
  );
  const { AgentContextService } = await import(
    "../../src/services/agents/agent-context.service.js"
  );

  return {
    createRuntime: () => {
      const orchestrator = new OrchestratorService();
      orchestrator.registerAgent(new NewsAgent());
      orchestrator.registerAgent(new CareerAgent());
      orchestrator.registerAgent(new EventsAgent());

      const createContext = (requestId: string) =>
        new AgentContextService({
          requestId,
          permission: "read",
          capabilities: {
            search: createSearchCapability(mockNewsProvider),
            career: careerCapability,
            events: eventsCapability,
          },
        });

      return { orchestrator, createContext };
    },
  };
});

// ── helpers ──────────────────────────────────────────────────────

interface HttpResult {
  status: number;
  body: Record<string, unknown>;
}

let server: Server;
let baseUrl: string;

function http(
  method: string,
  path: string,
  body?: unknown,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;

    const req = request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: {
          ...(payload !== undefined && {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          }),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            resolve({
              status: res.statusCode ?? 500,
              body: JSON.parse(raw) as Record<string, unknown>,
            });
          } catch {
            reject(new Error(`Non-JSON response: ${raw}`));
          }
        });
      },
    );

    req.on("error", reject);

    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
}

// ── lifecycle ────────────────────────────────────────────────────

beforeAll(async () => {
  // Dynamic import AFTER vi.mock is registered
  const { default: app } = await import("../../src/app.js");

  await new Promise<void>((resolve) => {
    server = createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr !== null && typeof addr === "object") {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
);

// ── tests ────────────────────────────────────────────────────────

describe("POST /agents/execute", () => {
  it("returns 200 for a valid news request", async () => {
    const res = await http("POST", "/agents/execute", {
      agentName: "news",
      input: { topic: "AI" },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agentName).toBe("news");
  });

  it("returns 400 when agentName is missing", async () => {
    const res = await http("POST", "/agents/execute", {
      input: { topic: "AI" },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "agentName is required.",
    });
  });

  it("returns 404 for an unknown agent", async () => {
    const res = await http("POST", "/agents/execute", {
      agentName: "nonexistent",
      input: {},
    });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Agent not found.");
  });

  it("returns 400 for invalid news input", async () => {
    const res = await http("POST", "/agents/execute", {
      agentName: "news",
      input: { topic: "" },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Invalid agent request.");
  });
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await http("GET", "/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      service: "jarvis-backend",
    });
  });
});
