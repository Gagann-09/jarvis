import { Router } from "express";
import { executeAgent } from "../controllers/agent.controller.js";

const router = Router();

router.post("/agents/execute", executeAgent);

export default router;