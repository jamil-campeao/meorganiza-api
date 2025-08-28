import prisma from "../db/client.js";

export const insertTransaction = async (req, res) => {
  const userId = req.user.id;
  const { type, value, date, description, categoryId } = req.body;

  if (!type || !value || !date || !description || !categoryId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const newTransaction = await prisma.transaction.create({
      data: {
        type: type,
        value: value,
        date: new Date(date),
        description: description,
        user: {
          connect: { id: userId },
        },
        category: {
          connect: { id: categoryId },
        },
      },
    });

    return res.status(200).json(newTransaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir a transação." });
  }
};

export const getAllTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
      },
      include: {
        category: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar as transações." });
  }
};

export const getTransactionById = async (req, res) => {
  const transactionId = parseInt(req.params.id);

  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        category: true,
      },
    });

    return res.status(200).json(transaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar a transação." });
  }
};

export const updateTransaction = async (req, res) => {
  const userId = req.user.id;
  const transactionId = parseInt(req.params.id);
  const { type, value, date, description, categoryId } = req.body;

  if (!type || !value || !date || !description || !categoryId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada." });
    }

    if (transaction.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Transação não pertence ao usuário." });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        type: type || transaction.type,
        value: value || transaction.value,
        date: date ? new Date(date) : transaction.date,
        description: description || transaction.description,
        categoryId: categoryId ? parseInt(categoryId) : transaction.categoryId,
      },
    });

    return res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar a transação." });
  }
};

export const deleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const transactionId = parseInt(req.params.id);

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada." });
    }

    if (transaction.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Transação não pertence ao usuário." });
    }

    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    return res.status(200).json({ message: "Transação excluída com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir a transação." });
  }
};
