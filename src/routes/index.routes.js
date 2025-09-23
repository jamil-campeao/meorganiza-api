import { Router } from "express";
import userRoutes from "./users.routes.js";
import loginRoutes from "./login.routes.js";
import transactionRoutes from "./transaction.routes.js";
import categoryRoutes from "./category.routes.js";
import investmentRoutes from "./investment.routes.js";
import notificationRoutes from "./notification.routes.js";
import bankstatementRoutes from "./bankstatements.routes.js";
import balanceForecastsRoutes from "./balanceforecasts.routes.js";
import accountRoutes from "./account.routes.js";
import bankRoutes from "./bank.routes.js";
import cardRoutes from "./card.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import billRoutes from "./bill.routes.js";

const router = Router();

router.use("/user", userRoutes);
router.use("/login", loginRoutes);
router.use("/transaction", transactionRoutes);
router.use("/categories", categoryRoutes);
router.use("/investment", investmentRoutes);
router.use("/notification", notificationRoutes);
router.use("/bankstatement", bankstatementRoutes);
router.use("/balanceforecast", balanceForecastsRoutes);
router.use("/account", accountRoutes);
router.use("/bank", bankRoutes);
router.use("/card", cardRoutes);
router.use("/invoice", invoiceRoutes);
router.use("/bill", billRoutes);

export default router;
