import { Router } from "express";
import {
  getUser,
  insertUser,
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

export default router;
