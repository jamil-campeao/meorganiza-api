import prisma from "../db/client.js";
import { AccountType } from "@prisma/client";

export const insertAccount = async (req, res) => {
  const userId = req.user.id;
  const { name, type, balance, bankId } = req.body;

  if (!name || !type || !balance || !bankId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const newAccount = await prisma.account.create({
      data: {
        name,
        type: AccountType[type],
        balance: parseFloat(balance),
        userId,
        bankId,
      },
    });
    return res.status(201).json(newAccount);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir a conta." });
  }
};

export const getAllAccounts = async (req, res) => {
  const userId = req.user.id;
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        bank: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return res.status(200).json(accounts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar as contas." });
  }
};

export const updateAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    const account = await prisma.account.findUnique({
      where: {
        id: parseInt(req.params.id),
        userId: parseInt(userId),
      },
    });

    if (!account) {
      return res.status(404).json({ message: "Conta não encontrada." });
    }

    const { name, type, balance, bankId } = req.body;

    if (!name || !type || !balance || !bankId) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }

    const updatedAccount = await prisma.account.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: {
        name,
        type: AccountType[type],
        balance: parseFloat(balance),
        bankId: String(bankId),
      },
    });

    return res.status(200).json(updatedAccount);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar a conta." });
  }
};

export const deleteAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    const account = await prisma.account.findUnique({
      where: {
        id: parseInt(req.params.id),
        userId: parseInt(userId),
      },
    });

    if (!account) {
      return res.status(404).json({ message: "Conta não encontrada." });
    }

    if (account.userId !== userId) {
      return res.status(403).json({ message: "Acesso negado." });
    }

    await prisma.account.delete({
      where: {
        id: parseInt(req.params.id),
      },
    });

    return res.status(200).json({ message: "Conta excluída com sucesso." });
  } catch (error) {
    // Verifica se o erro é de violação de chave estrangeira
    if (error.code === "P2003") {
      return res.status(409).json({
        message:
          "Esta conta não pode ser excluída pois está vinculada a transações ou cartões. Por favor, inative-a.",
      });
    }
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir a conta." });
  }
};

export const alterStatusAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    const account = await prisma.account.findUnique({
      where: {
        id: parseInt(req.params.id),
        userId: parseInt(userId),
      },
    });

    if (!account) {
      return res.status(404).json({ message: "Conta não encontrada." });
    }

    const updatedAccount = await prisma.account.update({
      where: {
        id: parseInt(req.params.id),
        userId: parseInt(userId),
      },
      data: {
        active: !account.active,
      },
    });

    console.log(updatedAccount.active);

    return res.status(200).json(updatedAccount);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao alterar status da conta." });
  }
};

export const getAccountById = async (req, res) => {
  const userId = req.user.id;

  try {
    const account = await prisma.account.findUnique({
      where: {
        id: parseInt(req.params.id),
        userId: parseInt(userId),
      },
    });

    if (!account) {
      return res.status(404).json({ message: "Conta não encontrada." });
    }

    return res.status(200).json(account);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar a conta." });
  }
};
