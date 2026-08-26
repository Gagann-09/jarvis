import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createServer, type Server } from "node:http";
import { request } from "node:http";

import type { Provider } from "../../src/types/provider.js";
import type { ToolCapability } from "../../src/types/tool.js";
import type {
  SearchInput,
  SearchResult,
} from "../../src/tools/web/search.schema.js";
import type { AgentResult } from "../../src/types/agent.js";

import { NewsAgent } from "../../src/agents/news/news.agent.js";
import { AgentContextService } from "../../src/services/agents/agent-context.service.js";
import { OrchestratorService } from "../../src/core/orchestrator/orchestrator.service.js";
import { createSearchCapability } from "../../src/tools/web/search.capability.js";
import { careerCapability } from "../../src/tools/web/career.capability.js";
import { eventsCapability } from "../../src/tools/web/events.capability.js";

// ── deterministic fixtures ───────────────────────────────────────

const FIXED_TIME = "2026-08-22T12:00:00.000Z";

const sourceProvider: Provider<
  SearchInput,
  readonly SearchResult[]
> = {
  name: "source-metadata-provider",

  async fetch(input) {
    return {
      success: true,
      data: [
        {
          title: `Result for ${input.query}`,
          url: "https://example.com/source-test",
          snippet: "Source metadata test result.",
        },
      ],
      source: {
        source: "source-metadata-provider",
        url: "https://example.com/source-test",
        retrievedAt: FIXED_TIME,
      },
    };
  },
};

const freshnessProvider: Provider<
  SearchInput,
  readonly SearchResult[]
> = {
  name: "freshness-metadata-provider",

  async fetch(input) {
    return {
      success: true,
      data: [
        {
          title: `Fresh result for ${input.query}`,
          url: "https://example.com/freshness-test",
          snippet: "Freshness metadata test result.",
          publishedAt: FIXED_TIME,
        },
      ],
      source: {
        source: "freshness-metadata-provider",
        url: "https://example.com/freshness-test",
        retrievedAt: FIXED_TIME,
      },
      freshness: {
        publishedAt: FIXED_TIME,
        ageMinutes: 0,
        score: 1,
      },
    };
  },
};

const failingProvider: Provider<
  SearchInput,
  readonly SearchResult[]
> = {
  name: "failing-provider",

  async fetch() {
    return {
      success: false,
      error: "Upstream provider unavailable.",
      source: {
        source: "failing-provider",
        retrievedAt: FIXED_TIME,
      },
    };
  },
};

// ── helpers ──────────────────────────────────────────────────────

const createContext = (
  requestId: string,
  searchCap: ToolCapability<SearchInput, readonly SearchResult[]>,
) =>
  new AgentContextService({
    requestId,
    permission: "read",
    capabilities: {
      search: searchCap,
      career: careerCapability,
      events: eventsCapability,
    },
  });

// ── 1–2: metadata survives through successful execution ──────────

describe("Metadata propagation: Provider → Capability → Agent", () => {
  it("source metadata survives successful execution", async () => {
    const capability = createSearchCapability(sourceProvider);
    const context = createContext("meta-source-001", capability);
    const agent = new NewsAgent();

    const result = await agent.execute(
      { topic: "source metadata" },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.source).toBeDefined();
    expect(result.source?.source).toBe(
      "source-metadata-provider",
    );
    expect(result.source?.retrievedAt).toBe(FIXED_TIME);
    expect(result.source?.url).toBe(
      "https://example.com/source-test",
    );
  });

  it("freshness metadata survives successful execution", async () => {
    const capability = createSearchCapability(freshnessProvider);
    const context = createContext("meta-fresh-001", capability);
    const agent = new NewsAgent();

    const result = await agent.execute(
      { topic: "freshness metadata" },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.freshness).toBeDefined();
    expect(result.freshness?.publishedAt).toBe(FIXED_TIME);
    expect(typeof result.freshness?.score).toBe("number");
  });
});

// ── 3: confidence reaches the agent decision ─────────────────────

describe("Confidence propagation to agent decision", () => {
  it("confidence reaches the agent decision", async () => {
    const capability = createSearchCapability(sourceProvider);
    const context = createContext("meta-conf-001", capability);
    const agent = new NewsAgent();

    const result = await agent.execute(
      { topic: "confidence propagation" },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    expect(result.decision.confidence).toBeDefined();
    expect(typeof result.decision.confidence.score).toBe(
      "number",
    );
    expect(result.decision.confidence.score).toBeGreaterThan(0);
    expect(result.decision.status).toMatch(
      /^(accept|review)$/,
    );
  });
});

// ── 4: provider failure reaches the agent ────────────────────────

describe("Failure propagation: Provider → Agent", () => {
  it("provider failure reaches the agent", async () => {
    const capability = createSearchCapability(failingProvider);
    const context = createContext("meta-fail-001", capability);
    const agent = new NewsAgent();

    const result = await agent.execute(
      { topic: "failing provider" },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.decision.status).toBe("review");
    expect(result.decision.confidence.score).toBe(0);
  });
});

// ── 5: agent failure reaches the orchestrator ────────────────────

describe("Failure propagation: Agent → Orchestrator", () => {
  it("agent failure reaches the orchestrator", async () => {
    const capability = createSearchCapability(failingProvider);
    const context = createContext("meta-orch-001", capability);

    const orchestrator = new OrchestratorService();
    orchestrator.registerAgent(new NewsAgent());

    const result = await orchestrator.execute(
      {
        agentName: "news",
        input: { topic: "orchestrator failure propagation" },
      },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.agentName).toBe("news");

    // The orchestrator wraps the full AgentResult in `result`
    const agentResult = result.result as AgentResult<unknown>;
    expect(agentResult.success).toBe(false);
    expect(agentResult.decision.status).toBe("review");
  });
});

// ── 6: unknown agent remains controlled ──────────────────────────

describe("Unknown agent handling", () => {
  it("unknown agent remains controlled", async () => {
    const capability = createSearchCapability(sourceProvider);
    const context = createContext("meta-unknown-001", capability);

    const orchestrator = new OrchestratorService();
    orchestrator.registerAgent(new NewsAgent());

    const result = await orchestrator.execute(
      {
        agentName: "nonexistent-agent",
        input: {},
      },
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Agent not found.");
    expect(result.agentName).toBe("nonexistent-agent");
    expect(result.result).toBeNull();
  });
});

// ── 7–8: HTTP preserves metadata and failures ────────────────────

/**
 * Mock the runtime so the HTTP layer uses our deterministic
 * source-metadata-provider instead of live providers.
 */
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
  const { careerCapability } = await import(
    "../../src/tools/web/career.capability.js"
  );
  const { eventsCapability } = await import(
    "../../src/tools/web/events.capability.js"
  );
  const { AgentContextService } = await import(
    "../../src/services/agents/agent-context.service.js"
  );

  const httpProvider: Provider<
    SearchInput,
    readonly SearchResult[]
  > = {
    name: "http-test-provider",

    async fetch(input) {
      return {
        success: true,
        data: [
          {
            title: `HTTP result for ${input.query}`,
            url: "https://example.com/http-test",
            snippet: "HTTP metadata test result.",
          },
        ],
        source: {
          source: "http-test-provider",
          url: "https://example.com/http-test",
          retrievedAt: FIXED_TIME,
        },
      };
    },
  };

  const careerHttpProvider: Provider<
    import("../../src/tools/web/career.schema.js").CareerSearchInput,
    readonly import("../../src/tools/web/career.schema.js").CareerOpportunity[]
  > = {
    name: "http-career-test-provider",

    async fetch(input) {
      return {
        success: true,
        data: [
          {
            title: `HTTP career result for ${input.query}`,
            organization: "HTTP Org",
            url: "https://example.com/http-career-test",
            description: "HTTP career metadata test result.",
            source: "http-career-test-provider",
            publishedAt: FIXED_TIME,
          },
        ],
        source: {
          source: "http-career-test-provider",
          url: "https://example.com/http-career-test",
          retrievedAt: FIXED_TIME,
        },
        provenance: {
          sources: [
            {
              source: "http-career-test-provider",
              url: "https://example.com/http-career-test",
              retrievedAt: FIXED_TIME,
            }
          ],
          sourceCount: 1,
        },
        freshness: {
          publishedAt: FIXED_TIME,
          ageMinutes: 0,
          score: 1,
        },
        confidence: {
          score: 0.95,
          reason: "HTTP test provider confidence",
        }
      };
    },
  };

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
            search: createSearchCapability(httpProvider),
            career: {
              definition: careerCapability.definition,
              async execute(input, context) {
                // Return exactly what validateCareerResult would output
                // based on the mocked provider, simulating the capability logic
                const res = await careerHttpProvider.fetch(input);
                if (!res.success) return res as any;
                return {
                  success: true,
                  data: res.data as any,
                  source: res.source,
                  provenance: res.provenance,
                  freshness: res.freshness,
                  confidence: res.confidence,
                };
              }
            },
            events: eventsCapability,
          },
        });

      return { orchestrator, createContext };
    },
  };
});

// ── HTTP helpers ─────────────────────────────────────────────────

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
    const payload =
      body !== undefined
        ? JSON.stringify(body)
        : undefined;

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

        res.on("data", (chunk: Buffer) =>
          chunks.push(chunk),
        );
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            resolve({
              status: res.statusCode ?? 500,
              body: JSON.parse(raw) as Record<
                string,
                unknown
              >,
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

// ── HTTP lifecycle ───────────────────────────────────────────────

beforeAll(async () => {
  const { default: app } = await import(
    "../../src/app.js"
  );

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

// ── HTTP tests ───────────────────────────────────────────────────

describe("HTTP metadata propagation", () => {
  it("HTTP preserves successful agent metadata", async () => {
    const res = await http("POST", "/agents/execute", {
      agentName: "news",
      input: { topic: "HTTP metadata" },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agentName).toBe("news");

    // The orchestrator stores the full AgentResult in `result`
    const agentResult = res.body.result as Record<
      string,
      unknown
    >;
    expect(agentResult.success).toBe(true);
    expect(agentResult.source).toBeDefined();

    const source = agentResult.source as Record<
      string,
      unknown
    >;
    expect(source.source).toBe("http-test-provider");
    expect(source.retrievedAt).toBe(FIXED_TIME);

    expect(agentResult.decision).toBeDefined();

    const decision = agentResult.decision as Record<
      string,
      unknown
    >;
    const confidence = decision.confidence as Record<
      string,
      unknown
    >;
    expect(typeof confidence.score).toBe("number");
    expect(
      (confidence.score as number),
    ).toBeGreaterThan(0);
  });

  it("HTTP preserves successful career agent metadata", async () => {
    const res = await http("POST", "/agents/execute", {
      agentName: "career",
      input: { query: "HTTP career metadata" },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agentName).toBe("career");

    const agentResult = res.body.result as Record<string, unknown>;
    expect(agentResult.success).toBe(true);
    
    // Check Data
    const data = agentResult.data as Record<string, unknown>;
    expect(data.opportunities).toBeDefined();
    expect((data.opportunities as unknown[])).toHaveLength(1);

    // Check Source
    expect(agentResult.source).toBeDefined();
    const source = agentResult.source as Record<string, unknown>;
    expect(source.source).toBe("http-career-test-provider");
    expect(source.retrievedAt).toBe(FIXED_TIME);

    // Check Provenance
    expect(agentResult.provenance).toBeDefined();
    const provenance = agentResult.provenance as Record<string, unknown>;
    expect(provenance.sourceCount).toBe(1);

    // Check Freshness
    expect(agentResult.freshness).toBeDefined();
    const freshness = agentResult.freshness as Record<string, unknown>;
    expect(freshness.publishedAt).toBe(FIXED_TIME);
    expect(freshness.score).toBe(1);

    // Check Decision / Confidence
    expect(agentResult.decision).toBeDefined();
    const decision = agentResult.decision as Record<string, unknown>;
    expect(decision.status).toBe("accept");
    
    const confidence = decision.confidence as Record<string, unknown>;
    expect(typeof confidence.score).toBe("number");
    expect(confidence.score).toBeCloseTo(0.95);
  });

  it("HTTP preserves controlled failures", async () => {
    const res = await http("POST", "/agents/execute", {
      agentName: "nonexistent",
      input: {},
    });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Agent not found.");
    expect(res.body.agentName).toBe("nonexistent");
    expect(res.body.result).toBeNull();
  });
});
