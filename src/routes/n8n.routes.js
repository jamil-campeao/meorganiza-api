import { Router } from "express";
import { getTypeConversation } from "../controllers/n8n.controller.js";

const router = Router();

//Autenticação bearer
const token = process.env.N8N_KEY_ROUTES;

router.use((req, res, next) => {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    if (bearerToken !== token) {
      return res.sendStatus(403);
    }
    next();
  }
});

router.get("/", getTypeConversation);

export default router;
