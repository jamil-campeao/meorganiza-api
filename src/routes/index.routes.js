import { Router } from "express";
import userRoutes from "./users.routes.js";
import loginRoutes from "./login.routes.js";
import transactionRoutes from "./transaction.routes.js";
import categoryRoutes from "./category.routes.js";
import investmentRoutes from "./investment.routes.js";

const router = Router();

router.use("/user", userRoutes);
router.use("/login", loginRoutes);
router.use("/transaction", transactionRoutes);
router.use("/category", categoryRoutes);
router.use("/investment", investmentRoutes);

export default router;
