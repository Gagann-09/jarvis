import express from "express";
import healthRoutes from "./routes/health.routes.js";
import agentRoutes from "./routes/agent.routes.js";

const app = express();

app.use(express.json());
app.use(healthRoutes);
app.use(agentRoutes);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (
      error instanceof SyntaxError &&
      "body" in error
    ) {
      res.status(400).json({
        success: false,
        error: "Invalid JSON.",
      });
      return;
    }

    next(error);
  },
);

export default app;