import express from "express";
import cors from "cors";
import prisma from "./db/client.js";
import routes from "./routes/index.routes.js";

function validateDatabaseConnection() {
  prisma
    .$connect()
    .then(() => {
      console.log("Conectado ao banco de dados com sucesso!");
    })
    .catch((error) => {
      console.error("Erro ao conectar ao banco de dados:", error);
    });
}

validateDatabaseConnection();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(routes);

export default app;
