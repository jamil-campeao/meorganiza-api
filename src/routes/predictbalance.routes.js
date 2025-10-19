import { Router } from "express";

import { authenticateUser } from "../services/authentication.js";
import {
  generatePrediction,
  getLastPrediction,
} from "../controllers/predictbalance.controller.js";

const router = Router();

router.use(authenticateUser);
router.post("/", generatePrediction);
router.get("/last", getLastPrediction);

export default router;
