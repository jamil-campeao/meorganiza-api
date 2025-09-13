import prisma from "../db/client.js";
import { TransactionType } from "@prisma/client";

// Função para determinar o mês e ano da fatura
const getInvoiceDate = (transactionDate, closingDay) => {
  let date = new Date(transactionDate);
  let month = date.getMonth() + 1; // getMonth() é 0-11
  let year = date.getFullYear();

  // Se a data da transação for igual ou maior que o dia de fechamento,
  // a despesa entra na fatura do mês seguinte.
  if (date.getDate() > closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { month, year };
};

export const insertTransaction = async (req, res) => {
  const userId = req.user.id;
  const {
    type,
    value,
    date,
    description,
    categoryId,
    accountId,
    cardId,
    targetAccountId,
  } = req.body;
  const transactionValue = parseFloat(value);

  // --- Lógica para RECEITA ---
  if (type === TransactionType.RECEITA) {
    if (!type || !value || !date || !description || !categoryId || !accountId) {
      return res
        .status(400)
        .json({
          message: "Para receitas, todos os campos e a conta são obrigatórios.",
        });
    }

    try {
      const [newTransaction, updatedAccount] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            type: TransactionType.RECEITA,
            value: transactionValue,
            date: new Date(date),
            description,
            userId,
            categoryId,
            accountId: parseInt(accountId),
          },
        }),
        prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { increment: transactionValue } },
        }),
      ]);

      return res.status(201).json(newTransaction);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro ao inserir a receita." });
    }
  }

  // --- Lógica para DESPESA ---
  if (type === TransactionType.DESPESA) {
    if (
      !type ||
      !value ||
      !date ||
      !description ||
      !categoryId ||
      (!accountId && !cardId)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Para despesas, todos os campos e uma conta ou cartão são obrigatórios.",
        });
    }
    if (accountId && cardId) {
      return res
        .status(400)
        .json({
          message:
            "A despesa não pode estar associada a uma conta e a um cartão simultaneamente.",
        });
    }

    try {
      let newTransaction;

      // Despesa na CONTA (Débito)
      if (accountId) {
        const [transaction, updatedAccount] = await prisma.$transaction([
          prisma.transaction.create({
            data: {
              type: TransactionType.DESPESA,
              value: transactionValue,
              date: new Date(date),
              description,
              userId,
              categoryId,
              accountId: parseInt(accountId),
            },
          }),
          prisma.account.update({
            where: { id: parseInt(accountId) },
            data: { balance: { decrement: transactionValue } },
          }),
        ]);
        newTransaction = transaction;
      }

      // Despesa no CARTÃO (Crédito)
      if (cardId) {
        const card = await prisma.card.findUnique({
          where: { id: parseInt(cardId) },
        });
        if (!card || card.userId !== userId) {
          return res
            .status(404)
            .json({
              message: "Cartão não encontrado ou não pertence ao usuário.",
            });
        }

        // Calcula a data da fatura
        const { month, year } = getInvoiceDate(date, card.closingDay);

        const invoice = await prisma.invoice.upsert({
          where: {
            cardId_month_year: { cardId: card.id, month, year },
          },
          update: {
            // Se a fatura já existe, apenas atualiza o valor
            totalAmount: { increment: transactionValue },
          },
          create: {
            // Se não existe, cria uma nova
            month,
            year,
            totalAmount: transactionValue,
            cardId: card.id,
          },
        });

        // Cria a transação e a associa à fatura
        newTransaction = await prisma.transaction.create({
          data: {
            type: TransactionType.DESPESA,
            value: transactionValue,
            date: new Date(date),
            description,
            userId,
            categoryId,
            cardId: card.id,
            invoiceId: invoice.id, // <<-- VÍNCULO COM A FATURA
          },
        });
      }

      return res.status(201).json(newTransaction);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro ao inserir a despesa." });
    }
  }

  // --- Lógica para TRANSFERENCIA ---
  if (type === TransactionType.TRANSFERENCIA) {
    if (!value || !date || !accountId || !targetAccountId) {
      return res
        .status(400)
        .json({
          message:
            "Para transferências, valor, data, conta de origem e conta de destino são obrigatórios.",
        });
    }
    if (accountId === targetAccountId) {
      return res
        .status(400)
        .json({
          message: "A conta de origem e destino não podem ser a mesma.",
        });
    }

    try {
      const [originAccount, targetAccount] = await prisma.$transaction([
        prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: transactionValue } },
        }),
        prisma.account.update({
          where: { id: parseInt(targetAccountId) },
          data: { balance: { increment: transactionValue } },
        }),
      ]);
      return res
        .status(200)
        .json({ message: "Transferência realizada com sucesso." });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Erro ao realizar a transferência." });
    }
  }

  return res.status(400).json({ message: "Tipo de transação inválido." });
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
  const userId = req.user.id;

  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        category: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada." });
    }

    if (transaction.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Transação não pertence ao usuário." });
    }

    return res.status(200).json(transaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar a transação." });
  }
};

export const updateTransaction = async (req, res) => {
  const userId = req.user.id;
  const transactionId = parseInt(req.params.id);
  const { value, date, description, categoryId, accountId, cardId } = req.body;
  const newValue = parseFloat(value);

  try {
    const updatedTransaction = await prisma.$transaction(async (prisma) => {
      // 1. Busca a transação original para saber o que reverter
      const originalTransaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId: userId,
        },
      });

      if (!originalTransaction) {
        throw new Error("Transação não encontrada ou não pertence ao usuário.");
      }

      const originalValue = parseFloat(originalTransaction.value);

      // 2. REVERTE O IMPACTO DA TRANSAÇÃO ORIGINAL
      // Se estava em uma conta...
      if (originalTransaction.accountId) {
        const amountToRevert =
          originalTransaction.type === "RECEITA"
            ? -originalValue
            : originalValue;
        await prisma.account.update({
          where: { id: originalTransaction.accountId },
          data: { balance: { increment: amountToRevert } },
        });
      }
      // Se estava em um cartão...
      if (originalTransaction.cardId && originalTransaction.invoiceId) {
        await prisma.invoice.update({
          where: { id: originalTransaction.invoiceId },
          data: { totalAmount: { decrement: originalValue } },
        });
      }

      // 3. APLICA O IMPACTO DA TRANSAÇÃO ATUALIZADA
      let newInvoiceId = null;
      // Se a nova transação for em uma conta...
      if (accountId) {
        const amountToApply =
          originalTransaction.type === "RECEITA" ? newValue : -newValue;
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { increment: amountToApply } },
        });
      }
      // Se a nova transação for em um cartão...
      if (cardId) {
        const card = await prisma.card.findUnique({
          where: { id: parseInt(cardId) },
        });
        if (!card) throw new Error("Cartão não encontrado.");

        const { month, year } = getInvoiceDate(date, card.closingDay);
        const invoice = await prisma.invoice.upsert({
          where: { cardId_month_year: { cardId: card.id, month, year } },
          update: { totalAmount: { increment: newValue } },
          create: { month, year, totalAmount: newValue, cardId: card.id },
        });
        newInvoiceId = invoice.id;
      }

      // 4. ATUALIZA A TRANSAÇÃO EM SI com os novos dados
      const transaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          value: newValue,
          date: new Date(date),
          description,
          categoryId: parseInt(categoryId),
          accountId: accountId ? parseInt(accountId) : null,
          cardId: cardId ? parseInt(cardId) : null,
          invoiceId: newInvoiceId,
        },
      });

      return transaction;
    });

    return res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: error.message || "Erro ao atualizar a transação." });
  }
};

export const deleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const transactionId = parseInt(req.params.id);

  try {
    await prisma.$transaction(async (prisma) => {
      // 1. Busca a transação que será deletada
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId: userId,
        },
      });

      if (!transaction) {
        throw new Error("Transação não encontrada ou não pertence ao usuário.");
      }

      const valueToDelete = parseFloat(transaction.value);

      // 2. REVERTE O SALDO/VALOR correspondente
      // Se for transação de CONTA
      if (transaction.accountId) {
        // Se for DESPESA, soma o valor de volta. Se for RECEITA, subtrai.
        const amountToRevert =
          transaction.type === "DESPESA" ? valueToDelete : -valueToDelete;
        await prisma.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: amountToRevert } },
        });
      }

      // Se for transação de CARTÃO
      if (transaction.cardId && transaction.invoiceId) {
        // Apenas subtrai o valor do total da fatura
        await prisma.invoice.update({
          where: { id: transaction.invoiceId },
          data: { totalAmount: { decrement: valueToDelete } },
        });
      }

      // 3. DELETA a transação
      await prisma.transaction.delete({
        where: { id: transactionId },
      });
    });

    return res.status(200).json({ message: "Transação excluída com sucesso." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: error.message || "Erro ao excluir a transação." });
  }
};
