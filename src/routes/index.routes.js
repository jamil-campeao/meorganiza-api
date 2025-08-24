import { Router } from "express";
import userRoutes from "./users.routes.js";
import loginRoutes from "./login.routes.js";

const router = Router();

router.use("/user", userRoutes);
router.use("/login", loginRoutes);

export default router;
