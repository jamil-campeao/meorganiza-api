import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import { handleChatMessage, getLastActiveChat, finishChat } from "../controllers/chat.controller.js";

const router = Router();

router.use(authenticateUser);

router.post("/", handleChatMessage);
router.get("/", getLastActiveChat);
router.patch("/", finishChat);

export default router;