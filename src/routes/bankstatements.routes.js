import { Router } from "express";
import {
  insertBankStatement,
  getAllBankStatements,
  deleteBankStatement,
} from "../controllers/bankstatements.controller.js";
import { authenticateUser } from "../services/authentication.js";

const router = Router();

router.use(authenticateUser);

router.post("/", insertBankStatement);
router.get("/", getAllBankStatements);
router.delete("/:id", deleteBankStatement);

export default router;
