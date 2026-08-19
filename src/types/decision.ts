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