import type { ConfidenceMetadata } from "./metadata.js";

export const DecisionStatus = {
  ACCEPT: "accept",
  REVIEW: "review",
  REJECT: "reject",
} as const;

export type DecisionStatus =
  (typeof DecisionStatus)[keyof typeof DecisionStatus];

export interface Decision {
  readonly status: DecisionStatus;
  readonly confidence: ConfidenceMetadata;
  readonly reason: string;
}

export const ConfidenceScore = {
  MIN: 0,
  ACCEPT_THRESHOLD: 0.5,
  MAX: 1,
} as const;

export const normalizeConfidence = (
  confidence: ConfidenceMetadata | undefined,
  fallbackReason: string,
): ConfidenceMetadata => {
  const rawScore = confidence?.score;

  const score =
    rawScore === undefined || !Number.isFinite(rawScore)
      ? ConfidenceScore.MIN
      : Math.min(
          ConfidenceScore.MAX,
          Math.max(ConfidenceScore.MIN, rawScore),
        );

  return {
    score,
    reason: confidence?.reason ?? fallbackReason,
  };
};

export const decisionStatusForConfidence = (
  confidence: ConfidenceMetadata,
): DecisionStatus =>
  confidence.score >= ConfidenceScore.ACCEPT_THRESHOLD
    ? DecisionStatus.ACCEPT
    : DecisionStatus.REVIEW;
