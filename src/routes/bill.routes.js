import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import {
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
  alterStatusBill,
  createBill,
} from "../controllers/bill.controller.js";

const router = Router();

router.use(authenticateUser);

router.get("/", getAllBills);
router.post("/", createBill);
router.get("/:id", getBillById);
router.put("/:id", updateBill);
router.delete("/:id", deleteBill);
router.patch("/alter-status/:id", alterStatusBill);

export default router;
