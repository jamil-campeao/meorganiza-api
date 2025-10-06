import { Router } from "express";
import {
  forgotPassword,
  getUser,
  insertUser,
  resetPassword,
  updatePassword,
  updateStatus,
  updateUser,
} from "../controllers/users.controller.js";
import { authenticateUser } from "../services/authentication.js";

const router = Router();
router.post("/", insertUser);
router.get("/", authenticateUser, getUser);
router.put("/", authenticateUser, updateUser);
router.put("/status", authenticateUser, updateStatus);
router.put("/password", authenticateUser, updatePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
