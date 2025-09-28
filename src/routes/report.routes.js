import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  getExpensesByCategory,
  getMonthlySummary,
} from "../controllers/report.controller.js";

const router = Router();
router.use(authenticateUser);
// Exemplo de uso: GET /api/report/expenses-by-category?startDate=2025-01-01&endDate=2025-01-31
router.get("/expenses-by-category", getExpensesByCategory);
// Exemplo de uso: GET /api/report/monthly-summary?year=2025
router.get("/monthly-summary", getMonthlySummary);

export default router;
