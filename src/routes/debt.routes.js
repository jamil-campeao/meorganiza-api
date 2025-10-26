import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  getDebts,
  getDebtById,
  insertDebt,
  payDebt,
  updateDebt,
  deleteDebt,
  getDebtPayments,
} from "../controllers/debt.controller.js";

const router = Router();

router.use(authenticateUser);

router.get("/payments/:id", getDebtPayments);
router.post("/pay/:id", payDebt);
router.post("/", insertDebt);
router.get("/", getDebts);
router.get("/:id", getDebtById);
router.delete("/:id", deleteDebt);
router.put("/:id", updateDebt);

export default router;
