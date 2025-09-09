import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import { alterStatusAccount, deleteAccount, getAccountById, getAllAccounts, insertAccount, updateAccount } from "../controllers/account.controller.js";

const router = Router();

router.use(authenticateUser);

router.post("/", insertAccount);
router.get("/", getAllAccounts)
router.get("/:id", getAccountById);
router.put("/:id", updateAccount);
router.delete(":/id", deleteAccount)
router.patch("/alternate/:id", alterStatusAccount);

export default router;