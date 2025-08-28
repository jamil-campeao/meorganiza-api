import jwt from "jsonwebtoken";
import prisma from "../db/client.js";

export const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token de autenticação não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({ error: `Token inválido ou expirado` });
  }
};

export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  return token;
};
