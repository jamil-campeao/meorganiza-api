import { Router } from "express";
import multer from "multer";
import {
  uploadBankStatement,
  getAllBankStatements,
  deleteBankStatement,
} from "../controllers/bankstatements.controller.js";
import { authenticateUser } from "../services/authentication.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateUser);

router.post("/", upload.single("file"), uploadBankStatement);
router.get("/", getAllBankStatements);
router.delete("/:id", deleteBankStatement);

export default router;
