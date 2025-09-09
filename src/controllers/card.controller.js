import prisma from "../db/client.js";
import { CardType } from "@prisma/client";

export const insertCard = async (req, res) => {
  const userId = req.user.id;
  const { name, type, limit, closingDay, dueDate, accountId } = req.body;

  if (!name || !type || !limit || !closingDay || !dueDate || !accountId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const account = await prisma.account.findFirst({
        where: { id: accountId, userId: userId }
    });

    if (!account) {
        return res.status(404).json({ message: "Conta não encontrada ou não pertence ao usuário." });
    }

    const newCard = await prisma.card.create({
      data: {
        name,
        type: CardType[type],
        limit: parseFloat(limit),
        closingDay: parseInt(closingDay),
        dueDate: parseInt(dueDate),
        accountId,
        userId,
      },
    });

    return res.status(201).json(newCard);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir o cartão." });
  }
};

export const getAllCards = async (req, res) => {
  const userId = req.user.id;

  try {
    const cards = await prisma.card.findMany({
      where: {
        userId: userId,
      },
      include: {
        account: {
          select: {
            name: true,
            bank: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json(cards);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar os cartões." });
  }
};

export const getCardById = async (req, res) => {
    const userId = req.user.id;
    const cardId = parseInt(req.params.id);

    try {
        const card = await prisma.card.findFirst({
            where: {
                id: cardId,
                userId: userId,
            },
            include: {
              account: true
            }
        });

        if (!card) {
            return res.status(404).json({ message: "Cartão não encontrado." });
        }

        return res.status(200).json(card);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar o cartão." });
    }
};


export const updateCard = async (req, res) => {
    const userId = req.user.id;
    const cardId = parseInt(req.params.id);
    const { name, type, limit, closingDay, dueDate, accountId } = req.body;

    if (!name || !type || !limit || !closingDay || !dueDate || !accountId) {
        return res
          .status(400)
          .json({ message: "Todos os campos são obrigatórios." });
      }

    try {
        const card = await prisma.card.findFirst({
            where: { id: cardId, userId: userId }
        });

        if (!card) {
            return res.status(404).json({ message: "Cartão não encontrado." });
        }

        const updatedCard = await prisma.card.update({
            where: { id: cardId },
            data: {
                name,
                type: CardType[type],
                limit: parseFloat(limit),
                closingDay: parseInt(closingDay),
                dueDate: parseInt(dueDate),
                accountId
            },
        });

        return res.status(200).json(updatedCard);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao atualizar o cartão." });
    }
};

export const deleteCard = async (req, res) => {
    const userId = req.user.id;
    const cardId = parseInt(req.params.id);

    try {
        const card = await prisma.card.findFirst({
            where: { id: cardId, userId: userId }
        });

        if (!card) {
            return res.status(404).json({ message: "Cartão não encontrado." });
        }

        await prisma.card.delete({
            where: { id: cardId },
        });

        return res.status(200).json({ message: "Cartão excluído com sucesso." });
    } catch (error) {
        console.error(error);
        // Tratar erro de restrição de chave estrangeira caso o cartão possua transações
        if (error.code === 'P2003') {
            return res.status(400).json({ message: "Não é possível excluir o cartão pois ele possui transações vinculadas." });
        }
        return res.status(500).json({ message: "Erro ao excluir o cartão." });
    }
};

export const inactiveCard = async (req, res) => {
    const userId = req.user.id;
    const cardId = parseInt(req.params.id);

    try {
        const card = await prisma.card.findFirst({
            where: { id: cardId, userId: userId },
        });

        if (!card) {
            return res.status(404).json({ message: "Cartão não encontrado." });
        }

        const updatedCard = await prisma.card.update({
            where: { id: cardId },
            data: {
                active: !card.active,
            },
        });

        return res.status(200).json(updatedCard);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao alterar status do cartão." });
    }
};