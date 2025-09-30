import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  insertBank,
  getAllBanks,
  getBankById,
  putBank,
} from "../controllers/bank.controller.js";

const router = Router();

router.use(authenticateUser);

router.post("/", insertBank);
router.get("/", getAllBanks);
router.get("/:id", getBankById);
router.put("/", putBank);

export default router;
