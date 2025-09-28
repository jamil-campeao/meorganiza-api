import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  deleteInvestment,
  getAllInvestments,
  getInvestmentById,
  inactiveInvestment,
  insertInvestment,
  updateInvestment,
  getInvestmentSummary,
} from "../controllers/investment.controller.js";

const router = Router();

router.use(authenticateUser);

router.get("/summary", getInvestmentSummary);
router.get("/", getAllInvestments);
router.get("/:id", getInvestmentById);
router.post("/", insertInvestment);
router.put("/:id", updateInvestment);
router.delete("/:id", deleteInvestment);
router.put("/inactive/:id", inactiveInvestment);

export default router;
