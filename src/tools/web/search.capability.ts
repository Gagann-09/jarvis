import { createToolCapability } from "../tool-adapter.js";
import { MockSearchTool } from "./mock-search.tool.js";
import {
  SearchInputSchema,
  SearchResultsSchema,
} from "./search.schema.js";

const searchTool = new MockSearchTool();

export const searchCapability = createToolCapability(
  searchTool,
  SearchInputSchema,
  SearchResultsSchema,
);