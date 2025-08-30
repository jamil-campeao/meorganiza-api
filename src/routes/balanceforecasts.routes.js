import { Router } from "express";

import { authenticateUser } from "../services/authentication.js";
import {
  generateBalanceForecast,
  getAllBalanceForecasts,
} from "../controllers/balanceforecasts.controller.js";

const router = Router();

router.use(authenticateUser);
router.post("/", generateBalanceForecast);
router.get("/", getAllBalanceForecasts);

export default router;
