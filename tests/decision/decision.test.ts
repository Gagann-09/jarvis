import { describe, expect, it } from "vitest";
import type { Decision } from "../../src/types/decision.js";

describe("Decision contract", () => {
  it("represents an accepted high-confidence decision", () => {
    const decision: Decision = {
      status: "accept",
      confidence: {
        score: 0.95,
        reason: "Strong evidence from verified sources.",
      },
      reason: "The result satisfies the current criteria.",
    };

    expect(decision.status).toBe("accept");
    expect(decision.confidence.score).toBe(0.95);
    expect(decision.reason).toBeTruthy();
  });

  it("represents a review decision", () => {
    const decision: Decision = {
      status: "review",
      confidence: {
        score: 0.62,
        reason: "Some information requires verification.",
      },
      reason: "Human review is required.",
    };

    expect(decision.status).toBe("review");
  });

  it("represents a rejected decision", () => {
    const decision: Decision = {
      status: "reject",
      confidence: {
        score: 0.2,
        reason: "Insufficient supporting evidence.",
      },
      reason: "The result does not meet the required criteria.",
    };

    expect(decision.status).toBe("reject");
  });
});