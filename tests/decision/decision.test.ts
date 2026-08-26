import { describe, expect, it } from "vitest";
import {
  ConfidenceScore,
  DecisionStatus,
  decisionStatusForConfidence,
  normalizeConfidence,
  type Decision,
} from "../../src/types/decision.js";

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

  it("normalizes confidence scores to the supported range", () => {
    expect(
      normalizeConfidence(
        { score: 1.4, reason: "Too high." },
        "Fallback.",
      ),
    ).toEqual({
      score: ConfidenceScore.MAX,
      reason: "Too high.",
    });

    expect(
      normalizeConfidence(
        { score: -0.2, reason: "Too low." },
        "Fallback.",
      ),
    ).toEqual({
      score: ConfidenceScore.MIN,
      reason: "Too low.",
    });
  });

  it("uses fallback confidence when metadata is missing or invalid", () => {
    expect(
      normalizeConfidence(undefined, "Missing confidence."),
    ).toEqual({
      score: ConfidenceScore.MIN,
      reason: "Missing confidence.",
    });

    expect(
      normalizeConfidence(
        { score: Number.NaN },
        "Invalid confidence.",
      ),
    ).toEqual({
      score: ConfidenceScore.MIN,
      reason: "Invalid confidence.",
    });
  });

  it("maps confidence to review or accept decisions", () => {
    expect(
      decisionStatusForConfidence({
        score: ConfidenceScore.ACCEPT_THRESHOLD - 0.01,
      }),
    ).toBe(DecisionStatus.REVIEW);

    expect(
      decisionStatusForConfidence({
        score: ConfidenceScore.ACCEPT_THRESHOLD,
      }),
    ).toBe(DecisionStatus.ACCEPT);
  });
});
