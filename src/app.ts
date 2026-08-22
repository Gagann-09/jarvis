import express from "express";
import healthRoutes from "./routes/health.routes.js";
import agentRoutes from "./routes/agent.routes.js";

const app = express();

app.use(express.json());
app.use(healthRoutes);
app.use(agentRoutes);

export default app;