import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
    getAllInvoices,
    getInvoiceById,
    payInvoice
} from "../controllers/invoice.controller.js";

const router = Router();

router.use(authenticateUser);

router.get("/", getAllInvoices);
router.get("/:id", getInvoiceById);
router.post("/pay/:id", payInvoice);

export default router;