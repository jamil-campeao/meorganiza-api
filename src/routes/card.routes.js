import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  insertCard,
  getAllCards,
  getCardById,
  updateCard,
  deleteCard,
  inactiveCard,
} from "../controllers/card.controller.js";

const router = Router();

router.use(authenticateUser);

router.post("/", insertCard);
router.get("/", getAllCards);
router.get("/:id", getCardById);
router.put("/:id", updateCard);
router.delete("/:id", deleteCard);
router.patch("/inactive/:id", inactiveCard);

export default router;
