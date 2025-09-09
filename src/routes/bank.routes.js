import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import { insertBank, getAllBanks } from "../controllers/bank.controller.js";

const router = Router();

router.use(authenticateUser);

router.post("/", insertBank);
router.get("/", getAllBanks);

export default router;