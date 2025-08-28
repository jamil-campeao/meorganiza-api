import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  deleteNotification,
  getAllNotifications,
  insertNotification,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticateUser);

router.get("/", getAllNotifications);
router.put("/read/:id", markNotificationAsRead);
router.post("/", insertNotification);
router.delete("/:id", deleteNotification);

export default router;
