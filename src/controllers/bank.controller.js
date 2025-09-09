import prisma from "../db/client.js";

export const insertBank = async (req, res) => {
  const { name, logo } = req.body;

  if (!name) {
    return res.status(400).json({ message: "O nome do banco é obrigatório." });
  }

  try {
    const newBank = await prisma.bank.create({
      data: {
        name,
        logo,
      },
    });
    return res.status(201).json(newBank);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir o banco." });
  }
};

export const getAllBanks = async (req, res) => {
  try {
    const banks = await prisma.bank.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return res.status(200).json(banks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar os bancos." });
  }
};