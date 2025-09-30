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

export const getBankById = async (req, res) => {
  try {
    const bank = await prisma.bank.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (!bank) {
      return res.status(404).json({ message: "Banco não encontrado." });
    }
    return res.status(200).json(bank);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar o banco." });
  }
};

export const putBank = async (req, res) => {
  const { id, name, logo } = req.body

  const data = {}

  if (name) data.name = name
  if (logo) data.logo = logo

  try {
    if (!id) {
      return res.status(400).json({ message: "O id do banco é obrigatório." })
    }
    
    const bank = await prisma.bank.findUnique({
      where: { id }
    })

    if (!bank) {
      return res.status(404).json({ message: "Banco não encontrado"})
    }

    const updatedBank = await prisma.bank.update({
      where: { id },
      data: data
    })

    return res.status(200).json(updatedBank)

  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Erro ao atualizar banco"})
    
  }
}