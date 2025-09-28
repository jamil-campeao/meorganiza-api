import prisma from "../db/client.js";

const calculateNextDueDate = (dueDateDay) => {
  const today = new Date();
  const currentDay = today.getDate();
  let month = today.getMonth();
  let year = today.getFullYear();

  // Se o dia de vencimento deste mês já passou, gera para o próximo mês
  if (currentDay > dueDateDay) {
    month += 1;
  }
  // new Date() lida com o overflow do mês (se month for 12, vira janeiro do próximo ano)
  return new Date(year, month, dueDateDay);
};

const getInvoiceDate = (transactionDate, closingDay) => {
  let date = new Date(transactionDate);
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  if (date.getDate() > closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { month, year };
};

export const createBill = async (req, res) => {
  const {
    description,
    amount,
    dueDateDay,
    recurring,
    categoryId,
    accountId,
    cardId,
  } = req.body;
  const userId = req.user.id;

  if (accountId && cardId) {
    return res.status(400).json({
      message:
        "Uma conta a pagar deve ser vinculada a uma conta ou a um cartão, não a ambos.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newBill = await tx.bill.create({
        data: {
          description,
          amount: parseFloat(amount),
          dueDateDay: parseInt(dueDateDay),
          recurring,
          userId,
          categoryId: parseInt(categoryId),
          accountId: accountId ? parseInt(accountId) : null,
          cardId: cardId ? parseInt(cardId) : null,
        },
      });

      // Se a conta não for única ("NONE"), gera o primeiro pagamento
      if (recurring !== "NONE") {
        const nextDueDate = calculateNextDueDate(parseInt(dueDateDay));

        await tx.billPayment.create({
          data: {
            dueDate: nextDueDate,
            amount: parseFloat(amount),
            status: "PENDING",
            billId: newBill.id,
          },
        });
      }

      return newBill;
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    res.status(500).json({ message: "Erro interno ao criar conta a pagar." });
  }
};

export const getAllBills = async (req, res) => {
  const userId = req.user.id;
  try {
    const bills = await prisma.bill.findMany({
      where: { userId },
      include: { category: true, account: true, card: true },
      orderBy: { description: "asc" },
    });
    return res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBillById = async (req, res) => {
  const userId = parseInt(req.user.id);
  const id = parseInt(req.params.id);

  try {
    const bills = await prisma.bill.findFirst({
      where: {
        userId: parseInt(userId),
        id: parseInt(id),
      },
      include: {
        category: true,
        account: true,
        card: true,
      },
    });
    return res.json(bills);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const updateBill = async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    description,
    amount,
    dueDateDay,
    recurring,
    categoryId,
    accountId,
    cardId,
  } = req.body;
  const userId = req.user.id;

  try {
    const updatedBill = await prisma.bill.update({
      where: { id: id, userId: userId },
      data: {
        description,
        amount: parseFloat(amount),
        dueDateDay: parseInt(dueDateDay),
        recurring,
        categoryId: parseInt(categoryId),
        accountId: accountId ? parseInt(accountId) : null,
        cardId: cardId ? parseInt(cardId) : null,
      },
    });
    return res.json(updatedBill);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Conta não encontrada ou não pertence ao usuário." });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteBill = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    // Deleta primeiro os pagamentos associados
    await prisma.billPayment.deleteMany({
      where: { billId: id, bill: { userId: userId } },
    });
    // Depois deleta a regra da conta
    await prisma.bill.delete({
      where: { id: id, userId: userId },
    });
    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Conta não encontrada ou não pertence ao usuário." });
    }
    res.status(500).json({ error: error.message });
  }
};
export const alterStatusBill = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = parseInt(req.user.id);

  try {
    const bill = await prisma.bill.findFirst({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
    });

    if (!bill) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    const updatedBill = await prisma.bill.update({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
      data: {
        active: !bill.active,
      },
      include: {
        category: true,
        account: true,
        card: true,
      },
    });
    return res.json(updatedBill);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

// --- CONTROLADORES PARA OS PAGAMENTOS (BillPayment) ---

export const getPendingBills = async (req, res) => {
  const userId = req.user.id;
  try {
    const pendingPayments = await prisma.billPayment.findMany({
      where: {
        bill: { userId: userId },
        status: "PENDING",
      },
      include: {
        bill: {
          select: {
            description: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });
    return res.json(pendingPayments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const payBill = async (req, res) => {
  const userId = req.user.id;
  const paymentId = parseInt(req.params.id);

  try {
    const billPayment = await prisma.billPayment.findFirst({
      where: { id: paymentId, bill: { userId: userId } },
      include: { bill: true },
    });

    if (!billPayment) {
      return res.status(404).json({ message: "Fatura não encontrada." });
    }
    if (billPayment.status === "PAID") {
      return res.status(400).json({ message: "Esta fatura já foi paga." });
    }

    const { bill } = billPayment;
    const transactionValue = parseFloat(billPayment.amount);

    const result = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          description: bill.description,
          value: transactionValue,
          date: new Date(),
          type: "DESPESA",
          userId: userId,
          categoryId: bill.categoryId,
          accountId: bill.accountId,
          cardId: bill.cardId,
        },
      });

      const updatedBillPayment = await tx.billPayment.update({
        where: { id: paymentId },
        data: {
          status: "PAID",
          paymentDate: new Date(),
          transactionId: newTransaction.id,
        },
      });

      if (bill.cardId) {
        const card = await tx.card.findUnique({ where: { id: bill.cardId } });
        const { month, year } = getInvoiceDate(
          updatedBillPayment.paymentDate,
          card.closingDay
        );

        await tx.invoice.upsert({
          where: { cardId_month_year: { cardId: bill.cardId, month, year } },
          update: { totalAmount: { increment: transactionValue } },
          create: {
            month,
            year,
            totalAmount: transactionValue,
            cardId: bill.cardId,
          },
        });
      } else if (bill.accountId) {
        await tx.account.update({
          where: { id: bill.accountId },
          data: { balance: { decrement: transactionValue } },
        });
      }

      // Se for recorrente, gera o próximo pagamento
      if (bill.recurring !== "NONE") {
        const currentDueDate = new Date(billPayment.dueDate);
        let nextMonth =
          currentDueDate.getMonth() + (bill.recurring === "MONTHLY" ? 1 : 12);
        let nextYear = currentDueDate.getFullYear();

        if (nextMonth > 11) {
          nextMonth -= 12;
          nextYear += 1;
        }

        const nextDueDateValue = new Date(nextYear, nextMonth, bill.dueDateDay);

        await tx.billPayment.create({
          data: {
            dueDate: nextDueDateValue,
            amount: bill.amount,
            status: "PENDING",
            billId: bill.id,
          },
        });
      }

      return updatedBillPayment;
    });

    res
      .status(200)
      .json({ message: "Conta paga com sucesso!", payment: result });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erro ao processar pagamento.", error: error.message });
  }
};
