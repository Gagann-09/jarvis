import { z } from "zod";

export const EventsSearchInputSchema = z.object({
  query: z.string().trim().min(1),
  location: z.string().trim().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const EventSchema = z.object({
  title: z.string().trim().min(1),
  organizer: z.string().trim().min(1),
  location: z.string().trim().min(1).optional(),
  url: z.url(),
  description: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  source: z.string().trim().min(1),
});

export const EventsSchema = z.array(EventSchema);

export type EventsSearchInput = z.infer<
  typeof EventsSearchInputSchema
>;

export type Event = z.infer<typeof EventSchema>;