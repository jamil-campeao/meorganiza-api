import prisma from "../db/client.js";
import {
  TransactionType,
  InvestmentType,
  DebtType,
  DebtStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { receipts, spends } from "../sugestioncategories.js";

// --- Funções Helpers ---

const getRandomValue = (min, max) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
};

const getRandomCategory = (categories) => {
  return categories[Math.floor(Math.random() * categories.length)];
};

const getInvoiceDate = (transactionDate, closingDay) => {
  let transDate = new Date(transactionDate);
  transDate.setUTCHours(0, 0, 0, 0);

  let closingDate = new Date(
    transDate.getFullYear(),
    transDate.getMonth(),
    closingDay
  );
  closingDate.setUTCHours(23, 59, 59, 999);

  let invoiceMonth = transDate.getMonth() + 1;
  let invoiceYear = transDate.getFullYear();

  if (transDate.getTime() > closingDate.getTime()) {
    invoiceMonth += 1;
    if (invoiceMonth > 12) {
      invoiceMonth = 1;
      invoiceYear += 1;
    }
  }

  return { month: invoiceMonth, year: invoiceYear };
};

// Helper para criar o próximo vencimento de contas
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

// --- O Controlador Principal ---

export const seedTestEnvironment = async (req, res) => {
  const { userEmail, senha } = req.body;
  const summary = []; // Para logar o que foi feito

  try {
    console.log("Iniciando o seed do ambiente de testes...");
    summary.push("Iniciando o seed...");

    // 1. Criar um usuário de teste
    const hashedPassword = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        name: "Usuário de Teste",
        email: userEmail,
        password: hashedPassword,
      },
    });
    console.log(`Usuário de teste criado: ${user.email}`);
    summary.push(`Usuário de teste criado: ${user.email}`);

    // 2. Criar categorias para o usuário
    const userReceiptCategories = await Promise.all(
      receipts.map((cat) =>
        prisma.category.create({
          data: {
            description: cat,
            type: TransactionType.RECEITA,
            userId: user.id,
          },
        })
      )
    );
    const userSpendCategories = await Promise.all(
      spends.map((cat) =>
        prisma.category.create({
          data: {
            description: cat,
            type: TransactionType.DESPESA,
            userId: user.id,
          },
        })
      )
    );
    console.log("Categorias de teste criadas.");
    summary.push("Categorias de teste criadas.");

    // 3. Criar Contas e Cartão
    const mainAccount = await prisma.account.create({
      data: {
        name: "Conta Corrente Principal",
        type: "CONTA_CORRENTE",
        balance: 5000.0,
        userId: user.id,
        bankId: "260", // Nubank
      },
    });

    const savingsAccount = await prisma.account.create({
      data: {
        name: "Poupança",
        type: "CONTA_POUPANCA",
        balance: 15000.0,
        userId: user.id,
        bankId: "104", // Caixa
      },
    });

    const creditCard = await prisma.card.create({
      data: {
        name: "Cartão de Crédito Nu",
        type: "CREDITO",
        limit: 10000.0,
        closingDay: 25,
        dueDate: 5,
        userId: user.id,
        accountId: mainAccount.id, // Associado à conta principal
      },
    });
    console.log("Contas e cartão de crédito de teste criados.");
    summary.push("Contas e cartão de crédito de teste criados.");

    // 4. Gerar transações dos últimos 60 dias
    const today = new Date();
    for (let i = 60; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Salário
      if (date.getDate() === 5) {
        const salaryCategory = userReceiptCategories.find(
          (c) => c.description === "Salário"
        );
        await prisma.$transaction([
          prisma.transaction.create({
            data: {
              type: TransactionType.RECEITA,
              value: 7000.0,
              date: date,
              description: "Salário Mensal",
              userId: user.id,
              categoryId: salaryCategory.id,
              accountId: mainAccount.id,
            },
          }),
          prisma.account.update({
            where: { id: mainAccount.id },
            data: { balance: { increment: 7000.0 } },
          }),
        ]);
      }

      // Despesas aleatórias
      const numExpenses = Math.floor(Math.random() * 4);
      for (let j = 0; j < numExpenses; j++) {
        const useCreditCard = Math.random() > 0.4;
        const expenseCategory = getRandomCategory(userSpendCategories);
        const expenseValue = getRandomValue(15, 250);

        if (useCreditCard) {
          // Despesa no Cartão de Crédito
          const { month, year } = getInvoiceDate(date, creditCard.closingDay);
          await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.upsert({
              where: {
                cardId_month_year: { cardId: creditCard.id, month, year },
              },
              update: { totalAmount: { increment: expenseValue } },
              create: {
                month,
                year,
                totalAmount: expenseValue,
                cardId: creditCard.id,
              },
            });
            await tx.transaction.create({
              data: {
                type: TransactionType.DESPESA,
                value: expenseValue,
                date: date,
                description: `Compra em ${expenseCategory.description}`,
                userId: user.id,
                categoryId: expenseCategory.id,
                cardId: creditCard.id,
                invoiceId: invoice.id,
              },
            });
          });
        } else {
          // Despesa na Conta (Débito)
          await prisma.$transaction([
            prisma.transaction.create({
              data: {
                type: TransactionType.DESPESA,
                value: expenseValue,
                date: date,
                description: `Compra em ${expenseCategory.description}`,
                userId: user.id,
                categoryId: expenseCategory.id,
                accountId: mainAccount.id,
              },
            }),
            prisma.account.update({
              where: { id: mainAccount.id },
              data: { balance: { decrement: expenseValue } },
            }),
          ]);
        }
      }
    }
    console.log("Transações de despesas dos últimos 60 dias foram criadas.");
    summary.push("Transações de despesas dos últimos 60 dias foram criadas.");

    // 5. ADICIONAR INVESTIMENTOS
    await prisma.investment.createMany({
      data: [
        {
          type: InvestmentType.ACAO,
          description: "PETR4",
          quantity: 100,
          acquisitionValue: 30.5,
          acquisitionDate: new Date("2024-05-10"),
          userId: user.id,
        },
        {
          type: InvestmentType.FII,
          description: "MXRF11",
          quantity: 50,
          acquisitionValue: 10.2,
          acquisitionDate: new Date("2024-03-15"),
          userId: user.id,
        },
        {
          type: InvestmentType.RENDA_FIXA_CDI,
          description: "CDB Neon 110%",
          initialAmount: 5000,
          acquisitionDate: new Date("2024-01-20"),
          indexer: "CDI",
          rate: 110,
          maturityDate: new Date("2026-01-20"),
          userId: user.id,
        },
        {
          type: InvestmentType.POUPANCA,
          description: "Poupança Caixa",
          initialAmount: 15000.0, // Vinculado à conta poupança
          acquisitionDate: new Date("2023-01-01"),
          userId: user.id,
        },
      ],
    });
    console.log("Investimentos de teste criados.");
    summary.push("Investimentos de teste criados.");

    // 6. ADICIONAR DÍVIDAS
    await prisma.debt.create({
      data: {
        description: "Financiamento Carro",
        type: DebtType.AUTO_LOAN,
        initialAmount: 60000,
        outstandingBalance: 45000,
        interestRate: 1.89,
        minimumPayment: 1250,
        paymentDueDate: 15,
        startDate: new Date("2023-10-15"),
        estimatedEndDate: new Date("2027-10-15"),
        status: DebtStatus.ACTIVE,
        userId: user.id,
        bankId: "341", // Itaú
      },
    });
    console.log("Dívidas de teste criadas.");
    summary.push("Dívidas de teste criadas.");

    // 7. ADICIONAR CONTAS A PAGAR (Bills)
    const categoryAluguel = userSpendCategories.find(
      (c) => c.description === "Aluguel"
    );
    const categoryLuz = userSpendCategories.find(
      (c) => c.description === "Luz"
    );
    const categoryCompras = userSpendCategories.find(
      (c) => c.description === "Compras Diversas"
    );

    // Conta Recorrente (Aluguel) - vinculada à conta
    const billAluguel = await prisma.bill.create({
      data: {
        description: "Aluguel Apartamento",
        amount: 2200.0,
        dueDateDay: 10,
        recurring: "MONTHLY",
        userId: user.id,
        categoryId: categoryAluguel.id,
        accountId: mainAccount.id,
      },
    });
    // Cria o primeiro pagamento pendente
    await prisma.billPayment.create({
      data: {
        dueDate: calculateNextDueDate(billAluguel.dueDateDay),
        amount: billAluguel.amount,
        status: "PENDING",
        billId: billAluguel.id,
      },
    });

    // Conta Recorrente (Luz) - vinculada à conta
    const billLuz = await prisma.bill.create({
      data: {
        description: "Conta de Luz",
        amount: 180.5,
        dueDateDay: 5,
        recurring: "MONTHLY",
        userId: user.id,
        categoryId: categoryLuz.id,
        accountId: mainAccount.id,
      },
    });
    // Cria o primeiro pagamento pendente
    await prisma.billPayment.create({
      data: {
        dueDate: calculateNextDueDate(billLuz.dueDateDay),
        amount: billLuz.amount,
        status: "PENDING",
        billId: billLuz.id,
      },
    });

    // Conta Única (Compra) - vinculada ao cartão
    await prisma.bill.create({
      data: {
        description: "Compra Loja XYZ (parcela)",
        amount: 350.0,
        dueDateDay: creditCard.dueDate, // Vencimento do cartão
        recurring: "NONE", // É única, mas pode ser uma parcela
        userId: user.id,
        categoryId: categoryCompras.id,
        cardId: creditCard.id,
      },
    });

    console.log("Contas a pagar de teste criadas.");
    summary.push("Contas a pagar de teste criadas.");

    // --- FIM DO SEED ---
    console.log("Seed do ambiente de testes concluído com sucesso!");
    summary.push("Seed concluído com sucesso!");

    return res
      .status(200)
      .json({ message: "Seed executado com sucesso!", summary: summary });
  } catch (error) {
    console.error("Erro ao executar o seed:", error);
    summary.push(`Erro: ${error.message}`);
    return res.status(500).json({
      message: "Erro interno ao executar o seed.",
      error: error.message,
      summary: summary,
    });
  }
};
