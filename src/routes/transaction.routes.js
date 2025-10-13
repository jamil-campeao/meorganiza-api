import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  deleteTransaction,
  getAllTransactions,
  getTransactionById,
  insertTransaction,
  updateTransaction,
  getAllTransactionsForUser,
} from "../controllers/transactions.controller.js";

const router = Router();

router.use(authenticateUser);

//rotas-n8n
router.get("/history", getAllTransactionsForUser);

router.post("/", insertTransaction);
router.get("/", getAllTransactions);
router.get("/:id", getTransactionById);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
