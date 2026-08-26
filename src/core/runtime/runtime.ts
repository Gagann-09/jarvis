import { CareerAgent } from "../../agents/career/career.agent.js";
import { EventsAgent } from "../../agents/events/events.agent.js";
import { NewsAgent } from "../../agents/news/news.agent.js";
import { AgentContextService } from "../../services/agents/agent-context.service.js";
import { careerCapability } from "../../tools/web/career.capability.js";
import { eventsCapability } from "../../tools/web/events.capability.js";
import { searchCapability } from "../../tools/web/search.capability.js";
import type { PermissionLevel } from "../../types/permissions.js";
import type { Runtime } from "../../types/runtime.js";
import { OrchestratorService } from "../orchestrator/orchestrator.service.js";
import { InMemoryMemory } from "../../services/memory/in-memory.memory.js";

export const createRuntime = (): Runtime => {
  const orchestrator = new OrchestratorService();

  orchestrator.registerAgent(new NewsAgent());
  orchestrator.registerAgent(new CareerAgent());
  orchestrator.registerAgent(new EventsAgent());

  const memory = new InMemoryMemory();

  const createContext = async (
    requestId: string,
    permission: PermissionLevel = "read",
  ) => {
    const relevantMemory = await memory.retrieve({});

    return new AgentContextService({
      requestId,
      permission,
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
      relevantMemory,
    });
  };

  return {
    orchestrator,
    createContext,
  };
};