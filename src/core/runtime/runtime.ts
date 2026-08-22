import { CareerAgent } from "../../agents/career/career.agent.js";
import { EventsAgent } from "../../agents/events/events.agent.js";
import { NewsAgent } from "../../agents/news/news.agent.js";
import { OrchestratorService } from "../orchestrator/orchestrator.service.js";
import { careerCapability } from "../../tools/web/career.capability.js";
import { eventsCapability } from "../../tools/web/events.capability.js";
import { searchCapability } from "../../tools/web/search.capability.js";
import { AgentContextService } from "../../services/agents/agent-context.service.js";

export const createRuntime = () => {
  const orchestrator = new OrchestratorService();

  orchestrator.registerAgent(new NewsAgent());
  orchestrator.registerAgent(new CareerAgent());
  orchestrator.registerAgent(new EventsAgent());

  const createContext = (
    requestId: string,
    permission: "read" = "read",
  ) =>
    new AgentContextService({
      requestId,
      permission,
      capabilities: {
        search: searchCapability,
        career: careerCapability,
        events: eventsCapability,
      },
    });

  return {
    orchestrator,
    createContext,
  };
};