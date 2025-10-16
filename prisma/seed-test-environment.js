import prisma from "../src/db/client.js";
import { TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { receipts, spends } from "../src/sugestioncategories.js";

// Função para gerar um valor aleatório dentro de um intervalo
const getRandomValue = (min, max) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
};

// Função para obter uma categoria aleatória de uma lista
const getRandomCategory = (categories) => {
  return categories[Math.floor(Math.random() * categories.length)];
};

// Lógica para determinar a data da fatura (baseada no seu `transactions.controller.js`)
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


async function main() {
  console.log("Iniciando o seed do ambiente de testes...");

  // 1. Limpar dados antigos (opcional, mas recomendado para testes)
  await prisma.transaction.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  
  // 2. Criar um usuário de teste
  const hashedPassword = await bcrypt.hash("test1234", 10);
  const user = await prisma.user.create({
    data: {
      name: "Usuário de Teste",
      email: "teste@email.com",
      password: hashedPassword,
    },
  });
  console.log(`Usuário de teste criado: ${user.email}`);

  // 3. Criar categorias para o usuário
  const userReceiptCategories = await Promise.all(
    receipts.map((cat) =>
      prisma.category.create({
        data: { description: cat, type: TransactionType.RECEITA, userId: user.id },
      })
    )
  );
  const userSpendCategories = await Promise.all(
    spends.map((cat) =>
      prisma.category.create({
        data: { description: cat, type: TransactionType.DESPESA, userId: user.id },
      })
    )
  );
  console.log("Categorias de teste criadas.");

  // 4. Criar Contas e Cartão
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
          balance: 15000.00,
          userId: user.id,
          bankId: "104" // Caixa
      }
  })

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

  // 5. Gerar transações dos últimos 60 dias
  const today = new Date();
  for (let i = 60; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // Adicionar salário mensal (Ex: todo dia 5)
    if (date.getDate() === 5) {
      const salaryCategory = userReceiptCategories.find(c => c.description === 'Salário');
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
      console.log(`Salário inserido em: ${date.toLocaleDateString()}`);
    }

    // Gerar despesas diárias aleatórias
    const numExpenses = Math.floor(Math.random() * 4); // De 0 a 3 despesas por dia
    for (let j = 0; j < numExpenses; j++) {
      const useCreditCard = Math.random() > 0.4; // 60% de chance de usar o cartão
      const expenseCategory = getRandomCategory(userSpendCategories);
      const expenseValue = getRandomValue(15, 250); // Valor entre 15 e 250

      if (useCreditCard) {
        // Despesa no Cartão de Crédito
        const { month, year } = getInvoiceDate(date, creditCard.closingDay);

        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.upsert({
                where: {
                    cardId_month_year: { cardId: creditCard.id, month, year },
                },
                update: {
                    totalAmount: { increment: expenseValue },
                },
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
                    invoiceId: invoice.id
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
  console.log("Seed do ambiente de testes concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });