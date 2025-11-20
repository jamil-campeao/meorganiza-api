import { Router } from "express";
import { authenticateUser } from "../services/authentication.js";
import { seedTestEnvironment } from "../controllers/mockdata.controller.js";

const router = Router();

router.use(authenticateUser);

router.post("/", seedTestEnvironment);

export default router;
