import prisma from "../db/client.js";
import { TransactionType } from "@prisma/client";

// Função para determinar o mês e ano da fatura
const getInvoiceDate = (transactionDate, closingDay) => {
  let transDate = new Date(transactionDate);

  // Define o fuso horário para UTC para evitar problemas com a virada do dia
  transDate.setUTCHours(0, 0, 0, 0);

  // A data de fechamento da fatura do mês da transação
  let closingDate = new Date(
    transDate.getFullYear(),
    transDate.getMonth(),
    closingDay
  );
  closingDate.setUTCHours(23, 59, 59, 999); // Garante que o dia inteiro seja considerado

  let invoiceMonth = transDate.getMonth() + 1;
  let invoiceYear = transDate.getFullYear();

  // Se a data da transação for APÓS o dia de fechamento daquele mês,
  // a fatura pertence ao próximo mês.
  if (transDate.getTime() > closingDate.getTime()) {
    invoiceMonth += 1;
    if (invoiceMonth > 12) {
      invoiceMonth = 1;
      invoiceYear += 1;
    }
  }

  return { month: invoiceMonth, year: invoiceYear };
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
      return res.status(400).json({
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
      return res.status(400).json({
        message:
          "Para despesas, todos os campos e uma conta ou cartão são obrigatórios.",
      });
    }
    if (accountId && cardId) {
      return res.status(400).json({
        message:
          "A despesa não pode estar associada a uma conta e a um cartão simultaneamente.",
      });
    }

    const { installments = 1 } = req.body;

    try {
      // Despesa na CONTA (Débito)
      if (accountId) {
        const [newTransaction] = await prisma.$transaction([
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
        return res.status(201).json(newTransaction);
      }

      // Despesa no CARTÃO (Crédito)
      if (cardId) {
        const card = await prisma.card.findUnique({
          where: { id: parseInt(cardId) },
        });
        if (!card || card.userId !== userId) {
          return res.status(404).json({
            message: "Cartão não encontrado ou não pertence ao usuário.",
          });
        }

        await prisma.$transaction(async (tx) => {
          const installmentValue = parseFloat(
            (transactionValue / installments).toFixed(2)
          );

          for (let i = 0; i < installments; i++) {
            const installmentDate = new Date(date);
            installmentDate.setMonth(installmentDate.getMonth() + i);

            const { month, year } = getInvoiceDate(
              installmentDate,
              card.closingDay
            );

            const invoice = await tx.invoice.upsert({
              where: {
                cardId_month_year: { cardId: card.id, month, year },
              },
              update: {
                totalAmount: { increment: installmentValue },
              },
              create: {
                month,
                year,
                totalAmount: installmentValue,
                cardId: card.id,
              },
            });

            await tx.transaction.create({
              data: {
                type: TransactionType.DESPESA,
                value: installmentValue,
                date: installmentDate,
                description: `${description} (${i + 1}/${installments})`,
                userId,
                categoryId,
                cardId: card.id,
                invoiceId: invoice.id,
              },
            });
          }
        });

        return res.status(201).json({
          message: `Compra parcelada em ${installments}x criada com sucesso.`,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro ao inserir a despesa." });
    }
  }

  // --- Lógica para TRANSFERENCIA ---
  if (type === TransactionType.TRANSFERENCIA) {
    if (!value || !date || !accountId || !targetAccountId) {
      return res.status(400).json({
        message:
          "Para transferências, valor, data, conta de origem e conta de destino são obrigatórios.",
      });
    }
    if (accountId === targetAccountId) {
      return res.status(400).json({
        message: "A conta de origem e destino não podem ser a mesma.",
      });
    }

    try {
      await prisma.$transaction(async (prisma) => {
        // 1. Valida se a conta de ORIGEM existe e pertence ao usuário
        const originAccount = await prisma.account.findFirst({
          where: {
            id: parseInt(accountId),
            userId: userId,
          },
        });

        if (!originAccount) {
          throw new Error(
            "Conta de origem não encontrada ou não pertence ao usuário."
          );
        }
        // Valida se a conta de DESTINO existe e pertence ao usuário
        const targetAccount = await prisma.account.findFirst({
          where: {
            id: parseInt(targetAccountId),
            userId: userId,
          },
        });

        if (!targetAccount) {
          throw new Error(
            "Conta de destino não encontrada ou não pertence ao usuário."
          );
        }

        // 2. Executa as atualizações de saldo
        // Debita da conta de origem
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: transactionValue } },
        });
        // Credita na conta de destino
        await prisma.account.update({
          where: { id: parseInt(targetAccountId) },
          data: { balance: { increment: transactionValue } },
        });
      });

      return res
        .status(200)
        .json({ message: "Transferência realizada com sucesso." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: error.message || "Erro ao realizar a transferência.",
      });
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
