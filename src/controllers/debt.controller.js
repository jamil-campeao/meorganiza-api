import prisma from "../db/client.js";
import { DebtStatus, DebtType, TransactionType } from "@prisma/client";
import { insertTransaction } from "../services/transactions.service.js";

export const getDebts = async (req, res) => {
  const userId = req.user.id;

  try {
    const debts = await prisma.debt.findMany({
      where: {
        userId: userId,
      },
      include: {
        bank: true,
      },
    });

    if (!debts) {
      return res.status(404).json({ message: "Debts not found" });
    }

    return res.status(200).json(debts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error getting debts" });
  }
};

export const getDebtById = async (req, res) => {
  const userId = req.user.id;
  const debtId = parseInt(req.params.id);

  try {
    const debt = await prisma.debt.findUnique({
      where: {
        id: debtId,
        userId: userId,
      },
    });

    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }

    return res.status(200).json(debt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error getting debt" });
  }
};

export const insertDebt = async (req, res) => {
  const userId = req.user.id;
  const {
    description,
    creditor,
    type,
    initialAmount,
    outstandingBalance,
    interestRate,
    minimumPayment,
    paymentDueDate,
    bankId,
    startDate,
    estimatedEndDate,
  } = req.body;

  if (
    !description ||
    !type ||
    !initialAmount ||
    !outstandingBalance ||
    !startDate ||
    !type
  ) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  const data = {
    description: description,
    initialAmount: parseFloat(initialAmount),
    type: DebtType[type],
    outstandingBalance: parseFloat(outstandingBalance),
    startDate: new Date(startDate),
    userId: parseInt(userId),
  };

  if (bankId) {
    data.bankId = bankId;

    const creditorName = await prisma.bank.findUnique({
      where: {
        id: bankId,
      },
      select: {
        name: true,
      },
    });

    if (creditorName) {
      data.creditor = creditorName.name;
    }
  } else {
    if (creditor) data.creditor = creditor;
  }

  if (interestRate) data.interestRate = parseFloat(interestRate);
  if (minimumPayment) data.minimumPayment = parseFloat(minimumPayment);
  if (paymentDueDate) data.paymentDueDate = parseInt(paymentDueDate);
  if (estimatedEndDate) data.estimatedEndDate = new Date(estimatedEndDate);

  try {
    const newDebt = await prisma.debt.create({
      data: data,
    });

    return res.status(201).json(newDebt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir dívida." });
  }
};

export const updateDebt = async (req, res) => {
  const userId = req.user.id;
  const debtId = parseInt(req.params.id);
  const {
    description,
    creditor,
    type,
    initialAmount,
    outstandingBalance,
    interestRate,
    minimumPayment,
    paymentDueDate,
    bankId,
    startDate,
    estimatedEndDate,
    status,
  } = req.body;

  try {
    if (
      !description ||
      !type ||
      !initialAmount ||
      !outstandingBalance ||
      !startDate ||
      !type
    ) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }

    const debt = await prisma.debt.findUnique({
      where: {
        id: debtId,
        userId: userId,
      },
    });

    if (!debt) {
      return res.status(404).json({ message: "Dívida não encontrada" });
    }

    if (debt.status === DebtStatus.PAID_OFF) {
      return res.status(400).json({ message: "Dívida ja foi quitada" });
    }

    const data = {
      description: description,
      initialAmount: parseFloat(initialAmount),
      type: DebtType[type],
      outstandingBalance: parseFloat(outstandingBalance),
      startDate: new Date(startDate),
      userId: parseInt(userId),
    };

    if (bankId) {
      data.bankId = bankId;

      const creditorName = await prisma.bank.findUnique({
        where: {
          id: bankId,
        },
        select: {
          name: true,
        },
      });

      if (creditorName) {
        data.creditor = creditorName.name;
      }
    } else {
      if (creditor) data.creditor = creditor;
    }

    if (interestRate) data.interestRate = parseFloat(interestRate);
    if (minimumPayment) data.minimumPayment = parseFloat(minimumPayment);
    if (paymentDueDate) data.paymentDueDate = parseInt(paymentDueDate);
    if (estimatedEndDate) data.estimatedEndDate = new Date(estimatedEndDate);
    if (status) data.status = DebtStatus[status];

    const updateDebt = await prisma.debt.update({
      data: data,
      where: {
        id: debtId,
        userId: userId,
      },
    });

    return res.status(200).json(updateDebt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar dívida" });
  }
};

export const payDebt = async (req, res) => {
  const userId = req.user.id;
  const debtId = parseInt(req.params.id);
  const { date, categoryId, accountId, targetAccountId, amountPaid } = req.body;

  try {
    const debt = await prisma.debt.findUnique({
      where: {
        id: debtId,
        userId: userId,
      },
    });

    if (!debt) {
      return res.status(404).json({ message: "Dívida nao encontrada" });
    }

    if (debt.status === DebtStatus.PAID_OFF) {
      return res.status(400).json({ message: "Dívida ja foi quitada" });
    }

    if (parseFloat(amountPaid) > debt.outstandingBalance) {
      return res.status(400).json({
        message: "O valor pago nao pode ser maior que o saldo pendente",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
        userId: userId,
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    if (category.type !== TransactionType.DESPESA) {
      return res
        .status(400)
        .json({ message: "A categoria selecionada não é uma despesa" });
    }

    const transactionData = {
      value: parseFloat(amountPaid),
      description: `Pagamento dívida: ${debt.description}`,
      type: "DESPESA",
      date: new Date(date),
      categoryId: categoryId,
      accountId: accountId,
      cardId: null,
      targetAccountId: targetAccountId,
    };

    const createdTransaction = await insertTransaction(transactionData, userId); // O serviço deve retornar a transação criada

    const newOutstandingBalance = debt.outstandingBalance - amountPaid;
    const isPaidOff = newOutstandingBalance <= 0;

    const updatedDebt = await prisma.debt.update({
      where: { id: debtId },
      data: {
        outstandingBalance: newOutstandingBalance,
        status: isPaidOff ? DebtStatus.PAID_OFF : debt.status,
      },
    });

    await prisma.debtPayment.create({
      data: {
        amount: amountPaid,
        paymentDate: transactionData.date,
        debtId: debtId,
        transactionId: createdTransaction.id,
      },
    });

    return res.status(200).json({
      message: isPaidOff
        ? "Dívida quitada com sucesso!"
        : "Pagamento parcial registrado.",
      debt: updatedDebt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao pagar dívida" });
  }
};

export const deleteDebt = async (req, res) => {
  const userId = req.user.id;
  const debtId = parseInt(req.params.id);

  try {
    const debt = await prisma.debt.findUnique({
      where: {
        id: debtId,
        userId: userId,
      },
    });

    if (!debt) {
      return res.status(404).json({ message: "Dívida não encontrada" });
    }

    if (debt.status === DebtStatus.PAID_OFF) {
      return res.status(400).json({ message: "Dívida já foi quitada" });
    }

    const deleteDebt = await prisma.debt.update({
      where: {
        id: debtId,
        userId: userId,
      },
      data: {
        status: DebtStatus.CANCELLED,
      },
    });

    return res.status(200).json(deleteDebt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao deletar dívida" });
  }
};

export const getDebtPayments = async (req, res) => {
  const userId = req.user.id;
  const debtId = parseInt(req.params.id);

  try {
    const debt = await prisma.debt.findUnique({
      where: {
        id: debtId,
        userId: userId,
      },
    });

    if (!debt) {
      return res.status(404).json({ message: "Dívida nao encontrada" });
    }

    const debtPayments = await prisma.debtPayment.findMany({
      where: {
        debtId: debtId,
      },
      include: {
        transaction: true,
      },
    });

    return res.status(200).json({
      debtPayments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar pagamentos" });
  }
};
