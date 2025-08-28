import prisma from "../db/client.js";

export const insertInvestment = async (req, res) => {
  const userId = req.user.id;
  const { type, description, quantity, acquisitionValue, acquisitionDate } =
    req.body;

  if (
    !type ||
    !description ||
    !quantity ||
    !acquisitionValue ||
    !acquisitionDate
  ) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const newInvestment = await prisma.investment.create({
      data: {
        type: type,
        description: description,
        quantity: parseFloat(quantity),
        acquisitionValue: parseFloat(acquisitionValue),
        acquisitionDate: new Date(acquisitionDate),
        user: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json(newInvestment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir o investimento." });
  }
};

export const getAllInvestments = async (req, res) => {
  const userId = req.user.id;

  try {
    const investments = await prisma.investment.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        acquisitionDate: "desc",
      },
    });

    return res.status(200).json(investments);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar os investimentos." });
  }
};

export const getInvestmentById = async (req, res) => {
  const investmentId = parseInt(req.params.id);

  try {
    const investment = await prisma.investment.findUnique({
      where: {
        id: investmentId,
      },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    return res.status(200).json(investment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar o investimento." });
  }
};

export const updateInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);
  const { type, description, quantity, acquisitionValue, acquisitionDate } =
    req.body;

  if (
    !type ||
    !description ||
    !quantity ||
    !acquisitionValue ||
    !acquisitionDate
  ) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    const updatedInvestment = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        type: type || investment.type,
        description: description || investment.description,
        quantity: quantity ? parseFloat(quantity) : investment.quantity,
        acquisitionValue:
          parseFloat(acquisitionValue) || investment.acquisitionValue,
        acquisitionDate: acquisitionDate
          ? new Date(acquisitionDate)
          : investment.acquisitionDate,
      },
    });

    return res.status(200).json({
      message: "Investimento atualizado com sucesso.",
      investment: updatedInvestment,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar o investimento." });
  }
};

export const deleteInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    await prisma.investment.delete({
      where: { id: investmentId },
    });

    return res
      .status(200)
      .json({ message: "Investimento excluído com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir o investimento." });
  }
};

export const inactiveInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);

  if (!investmentId) {
    return res.status(400).json({ message: "ID do investimento obrigatório." });
  }

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        active: investment.active ? false : true,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao alterar status do investimento." });
  }
};
