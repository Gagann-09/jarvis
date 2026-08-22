import { z } from "zod";
import type { Provider, ProviderResult } from "../../types/provider.js";
import type { Event, EventsSearchInput } from "../../tools/web/events.schema.js";
import { EventsSchema } from "../../tools/web/events.schema.js";
import type { HttpClient } from "../http/http-client.js";

const MeetupEventNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  eventUrl: z.string(),
  description: z.string(),
  dateTime: z.string(),
  endTime: z.string().nullable().optional(),
  isOnline: z.boolean().nullable().optional(),
  venue: z
    .object({
      name: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      lat: z.number().nullable().optional(),
      lon: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  group: z.object({
    name: z.string(),
    urlname: z.string(),
  }),
});

const MeetupGraphQLResponseSchema = z.object({
  data: z
    .object({
      eventSearch: z
        .object({
          edges: z
            .array(
              z.object({
                node: MeetupEventNodeSchema,
              })
            )
            .optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  errors: z
    .array(
      z.object({
        message: z.string(),
      })
    )
    .optional(),
});

type MeetupEventNode = z.infer<typeof MeetupEventNodeSchema>;

const MEETUP_GRAPHQL_URL = "https://api.meetup.com/gql-ext";

export class MeetupEventsProvider implements Provider<EventsSearchInput, readonly Event[]> {
  readonly name = "meetup-events";

  constructor(private readonly httpClient: HttpClient) {}

  async fetch(input: EventsSearchInput): Promise<ProviderResult<readonly Event[]>> {
    const token = process.env.MEETUP_ACCESS_TOKEN;
    if (!token) {
      return {
        success: false,
        error: "Missing MEETUP_ACCESS_TOKEN environment variable.",
      };
    }

    const query = `
      query MeetupEventSearch($filter: EventSearchFilter!, $first: Int) {
        eventSearch(filter: $filter, first: $first) {
          edges {
            node {
              id
              title
              eventUrl
              description
              dateTime
              endTime
              isOnline
              venue {
                name
                city
                state
                country
                lat
                lon
              }
              group {
                name
                urlname
              }
            }
          }
        }
      }
    `;

    const searchKeyword = input.location
      ? `${input.query} ${input.location}`
      : input.query;

    const variables = {
      filter: {
        query: searchKeyword,
      },
      first: 20,
    };

    let responseData: unknown;
    try {
      responseData = await this.httpClient.post(
        MEETUP_GRAPHQL_URL,
        {
          query,
          variables,
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const safeErrorMessage = errorMessage.replace(token, "[REDACTED]");
      return {
        success: false,
        error: `Meetup API request failed: ${safeErrorMessage}`,
      };
    }

    const parseResult = MeetupGraphQLResponseSchema.safeParse(responseData);

    if (!parseResult.success) {
      return {
        success: false,
        error: "Malformed Meetup API response.",
      };
    }

    const { data, errors } = parseResult.data;

    if (errors && errors.length > 0) {
      const messages = errors.map((e) => e.message).join(", ");
      const safeMessages = messages.replace(token, "[REDACTED]");
      return {
        success: false,
        error: `Meetup GraphQL error: ${safeMessages}`,
      };
    }

    if (!data?.eventSearch?.edges) {
      return {
        success: true,
        data: [],
        source: {
          source: "meetup",
          url: "https://www.meetup.com",
          retrievedAt: new Date().toISOString(),
        },
      };
    }

    const mappedEvents = data.eventSearch.edges.map((edge) => this.mapNode(edge.node));

    const validatedEvents = EventsSchema.safeParse(mappedEvents);
    if (!validatedEvents.success) {
      return {
        success: false,
        error: "Failed to map Meetup events to internal schema.",
      };
    }

    return {
      success: true,
      data: validatedEvents.data,
      source: {
        source: "meetup",
        url: "https://www.meetup.com",
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  private mapNode(node: MeetupEventNode): Event {
    let location: string | undefined;

    if (node.venue) {
      const parts = [node.venue.name, node.venue.city, node.venue.state, node.venue.country].filter(
        (part): part is string => typeof part === "string" && part.trim() !== ""
      );
      location = parts.length > 0 ? parts.join(", ") : undefined;
    }

    if (!location && node.isOnline) {
      location = "Online Event";
    }

    return {
      title: node.title,
      organizer: node.group.name,
      ...(location && { location }),
      url: node.eventUrl,
      description: node.description,
      startsAt: node.dateTime,
      ...(node.endTime && { endsAt: node.endTime }),
      source: "meetup",
    };
  }
}
