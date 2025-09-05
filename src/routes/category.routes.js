import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  deleteCategory,
  getAllCategories,
  getCategoryById,
  inactiveCategory,
  insertCategory,
  updateCategory,
} from "../controllers/category.controller.js";

const router = Router();

router.use(authenticateUser);

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.post("/", insertCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.put("/inactive/:id", inactiveCategory);

export default router;
