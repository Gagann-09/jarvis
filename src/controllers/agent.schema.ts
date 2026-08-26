import { z } from "zod";

const NewsRequestSchema = z.object({
  agentName: z.literal("news"),
  input: z.object({
    topic: z.string().trim().min(1),
  }),
});

const CareerRequestSchema = z.object({
  agentName: z.literal("career"),
  input: z.object({
    query: z.string().trim().min(1),
    location: z.string().trim().min(1).optional(),
    remote: z.boolean().optional(),
  }),
});

const EventsRequestSchema = z.object({
  agentName: z.literal("events"),
  input: z.object({
    query: z.string().trim().min(1),
    location: z.string().trim().min(1).optional(),
    startDate: z.string().trim().min(1).optional(),
    endDate: z.string().trim().min(1).optional(),
  }),
});

export const AgentRequestSchema = z.discriminatedUnion("agentName", [
  NewsRequestSchema,
  CareerRequestSchema,
  EventsRequestSchema,
]);

export type AgentRequest = z.infer<typeof AgentRequestSchema>;