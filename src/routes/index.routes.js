import { Router } from "express";
import userRoutes from "./users.routes.js";
import loginRoutes from "./login.routes.js";
import transactionRoutes from "./transaction.routes.js";
import categoryRoutes from "./category.routes.js";
import investmentRoutes from "./investment.routes.js";
import notificationRoutes from "./notification.routes.js";
import bankstatementRoutes from "./bankstatements.routes.js";

const router = Router();

router.use("/user", userRoutes);
router.use("/login", loginRoutes);
router.use("/transaction", transactionRoutes);
router.use("/category", categoryRoutes);
router.use("/investment", investmentRoutes);
router.use("/notification", notificationRoutes);
router.use("/bankstatement", bankstatementRoutes);

export default router;
