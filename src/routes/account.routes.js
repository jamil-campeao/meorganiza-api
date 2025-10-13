import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  alterStatusAccount,
  deleteAccount,
  getAccountById,
  getAllAccounts,
  insertAccount,
  updateAccount,
  getTotalBalance,
} from "../controllers/account.controller.js";

const router = Router();

router.use(authenticateUser);

router.get("/total-balance", getTotalBalance);
router.post("/", insertAccount);
router.get("/", getAllAccounts);
router.get("/:id", getAccountById);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);
router.patch("/alternate-status/:id", alterStatusAccount);

export default router;
