import prisma from "../db/client.js";
import * as transactionsService from "../services/transactions.service.js";

export const insertTransaction = async (req, res) => {
  const userId = req.user.id;

  try {
    const transaction = await transactionsService.insertTransaction(
      req.body,
      userId
    );
    return res.status(201).json(transaction);
  } catch (error) {
    // Captura erros lançados pelo serviço
    console.error("Erro no controller insertTransaction:", error);
    return res
      .status(
        error.message.includes("obrigatório") ||
          error.message.includes("não pode")
          ? 400
          : 500
      )
      .json({ message: error.message });
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
        card: true,
        account: true,
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

export const getAllTransactionsForUser = async (req, res) => {
  const userId = req.user.id;
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: parseInt(userId),
      },
      select: {
        date: true,
        type: true,
        value: true,
        description: true,
        category: {
          select: {
            description: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // res.status(200).send(transactions);

    // Formata os dados em um CSV simples, que é ótimo para a IA entender
    const csvData = transactions
      .map(
        (t) =>
          `${t.date.toISOString().split("T")[0]},${t.type},${t.value},"${
            t.category.description
          }","${t.description}"`
      )
      .join("\n");

    res.header("Content-Type", "text/csv");
    return res.status(200).send(csvData);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar o histórico de transações." });
  }
};
