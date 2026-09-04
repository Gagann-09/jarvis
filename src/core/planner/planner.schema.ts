import { z } from "zod";
import { PermissionLevel } from "../../types/permissions.js";

// --- Reusable sub-schemas (following existing inline convention) ---

const ConfidenceMetadataSchema = z.object({
  score: z.number().min(0).max(1),
  reason: z.string().optional(),
}).passthrough();

// --- PlannerInput schema ---

export const PlannerInputSchema = z.object({
  requestId: z.string().trim().min(1, "PlannerInput.requestId must be a non-empty string."),
  intent: z.string().trim().min(1, "PlannerInput.intent must be a non-empty string."),
  permission: z.enum([
    PermissionLevel.READ,
    PermissionLevel.PREPARE,
    PermissionLevel.EXECUTE,
  ], {
    message: "PlannerInput.permission must be a valid PermissionLevel.",
  }),
}).passthrough();

// --- PlanStep schema ---

export const PlanStepSchema = z.object({
  stepId: z.string().trim().min(1, "PlanStep.stepId must be a non-empty string."),
  agentName: z.string().trim().min(1, "PlanStep.agentName must be a non-empty string."),
  input: z.unknown(),
  requiredPermission: z.enum([
    PermissionLevel.READ,
    PermissionLevel.PREPARE,
    PermissionLevel.EXECUTE,
  ], {
    message: "PlanStep.requiredPermission must be a valid PermissionLevel.",
  }),
  dependsOn: z.array(z.string()).readonly(),
  description: z.string().trim().min(1, "PlanStep.description must be a non-empty string."),
}).passthrough();

// --- ExecutionPlan schema ---

export const ExecutionPlanSchema = z.object({
  planId: z.string().trim().min(1, "ExecutionPlan.planId must be a non-empty string."),
  requestId: z.string().trim().min(1, "ExecutionPlan.requestId must be a non-empty string."),
  steps: z.array(PlanStepSchema).min(1, "ExecutionPlan.steps must contain at least one step.").readonly(),
  confidence: ConfidenceMetadataSchema.optional(),
  createdAt: z.string().datetime({ message: "ExecutionPlan.createdAt must be a valid ISO timestamp." }),
}).passthrough().refine(
  (plan) => {
    const stepIds = new Set<string>();

    for (const step of plan.steps) {
      if (stepIds.has(step.stepId)) {
        return false;
      }
      stepIds.add(step.stepId);
    }

    return true;
  },
  {
    message: "ExecutionPlan contains duplicate stepId values.",
  },
).refine(
  (plan) => {
    const stepIds = new Set(plan.steps.map((step: { stepId: string }) => step.stepId));

    for (const step of plan.steps) {
      for (const dep of step.dependsOn) {
        if (!stepIds.has(dep)) {
          return false;
        }
      }
    }

    return true;
  },
  {
    message: "ExecutionPlan contains dependsOn references to non-existent stepIds.",
  },
).refine(
  (plan) => {
    for (const step of plan.steps) {
      if (step.dependsOn.includes(step.stepId)) {
        return false;
      }
    }

    return true;
  },
  {
    message: "ExecutionPlan contains a step that depends on itself.",
  },
);
