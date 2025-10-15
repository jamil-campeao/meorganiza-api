import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import { handleChatMessage } from "../controllers/chat.controller.js";

const router = Router();

router.use(authenticateUser);

router.post("/", handleChatMessage);

export default router;