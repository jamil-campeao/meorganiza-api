import prisma from "../db/client.js";
import { TransactionType, Prisma } from "@prisma/client";

// Função para determinar o mês e ano da fatura
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

export const insertTransaction = async (transactionBody, userId) => {
  const {
    type,
    value,
    date,
    description,
    categoryId,
    accountId,
    cardId,
    targetAccountId, // Para transferência
    installments = 1, // Pega do transactionBody, não do req.body
  } = transactionBody;
  const transactionValue = parseFloat(value);

  // Validação inicial básica de valor
  if (isNaN(transactionValue) || transactionValue <= 0) {
    throw new Error("O valor da transação deve ser um número positivo.");
  }
  if (!date) {
    throw new Error("A data da transação é obrigatória.");
  }

  // --- Lógica para RECEITA ---
  if (type === TransactionType.RECEITA) {
    if (!description || !categoryId || !accountId) {
      throw new Error(
        "Descrição, Categoria e Conta são obrigatórios para Receita."
      );
    }
    // Usar transação Prisma
    return await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          type,
          value: transactionValue,
          date: new Date(date),
          description,
          userId,
          categoryId: parseInt(categoryId),
          accountId: parseInt(accountId),
        },
      });
      await tx.account.update({
        where: { id: parseInt(accountId), userId: userId },
        data: { balance: { increment: transactionValue } },
      });
      return newTransaction; // Retorna a transação criada
    });
  }

  // --- Lógica para DESPESA ---
  if (type === TransactionType.DESPESA) {
    if (!description || !categoryId || (!accountId && !cardId)) {
      throw new Error(
        "Descrição, Categoria e (Conta OU Cartão) são obrigatórios para Despesa."
      );
    }
    if (accountId && cardId) {
      throw new Error(
        "A despesa não pode estar associada a uma conta e a um cartão simultaneamente."
      );
    }

    // --- Despesa na CONTA (Débito) ---
    if (accountId) {
      if (installments > 1) {
        throw new Error(
          "Parcelamento não é permitido para despesas em conta corrente/débito."
        );
      }
      return await prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
          data: {
            type,
            value: transactionValue,
            date: new Date(date),
            description,
            userId,
            categoryId: parseInt(categoryId),
            accountId: parseInt(accountId),
          },
        });
        // Verificar saldo antes? Opcional. O Prisma pode falhar se houver constraints.
        await tx.account.update({
          where: { id: parseInt(accountId), userId: userId },
          data: { balance: { decrement: transactionValue } },
        });
        return newTransaction; // Retorna a transação criada
      });
    }

    // --- Despesa no CARTÃO (Crédito) ---
    if (cardId) {
      const card = await prisma.card.findUnique({
        where: { id: parseInt(cardId), userId: userId },
      });
      if (!card) {
        throw new Error("Cartão não encontrado ou não pertence ao usuário.");
      }

      const createdTransactions = []; // Para armazenar IDs se necessário

      // Usar transação Prisma para garantir que tudo (parcelas, fatura) seja criado ou nada
      await prisma.$transaction(async (tx) => {
        const numInstallments = parseInt(installments) || 1;
        // Evitar divisão por zero e garantir pelo menos 1
        const safeInstallments = numInstallments > 0 ? numInstallments : 1;
        // Arredondamento cuidadoso para evitar problemas com centavos
        const totalValueDecimal = new Prisma.Decimal(transactionValue);
        const installmentValueDecimal = totalValueDecimal
          .dividedBy(safeInstallments)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
        let firstInstallmentValueDecimal = installmentValueDecimal.plus(
          totalValueDecimal.minus(
            installmentValueDecimal.times(safeInstallments)
          )
        );

        for (let i = 0; i < safeInstallments; i++) {
          const installmentDate = new Date(date);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          // Use toISOString para consistência e para evitar problemas de fuso horário ao salvar
          const installmentDateISO = installmentDate.toISOString();

          const currentInstallmentValue =
            i === 0
              ? firstInstallmentValueDecimal.toNumber()
              : installmentValueDecimal.toNumber();

          const { month, year } = getInvoiceDate(
            installmentDate,
            card.closingDay
          );

          const invoice = await tx.invoice.upsert({
            where: { cardId_month_year: { cardId: card.id, month, year } },
            update: { totalAmount: { increment: currentInstallmentValue } },
            create: {
              month,
              year,
              totalAmount: currentInstallmentValue,
              cardId: card.id,
            },
          });

          const created = await tx.transaction.create({
            data: {
              type: TransactionType.DESPESA,
              value: currentInstallmentValue,
              date: installmentDateISO, // Salvar como ISO string
              description:
                safeInstallments > 1
                  ? `${description} (${i + 1}/${safeInstallments})`
                  : description,
              userId,
              categoryId: parseInt(categoryId),
              cardId: card.id,
              invoiceId: invoice.id,
            },
          });
          createdTransactions.push(created); // Guarda a transação criada
        }
      });

      // Decidir o que retornar: a primeira transação, todas, ou apenas uma mensagem.
      // Retornar a primeira transação pode ser útil para o 'payDebt'.
      if (createdTransactions.length > 0) {
        // Se for SÓ UMA parcela (caso do payDebt), retorna a transação.
        // Se for MAIS DE UMA, retorna a mensagem.
        return createdTransactions.length === 1
          ? createdTransactions[0]
          : {
              message: `Compra parcelada em ${installments}x criada com sucesso.`,
            };
      } else {
        // Isso não deveria acontecer se installments >= 1, mas é bom ter um fallback
        throw new Error("Nenhuma transação de cartão foi criada.");
      }
    }
  }

  // --- Lógica para TRANSFERENCIA ---
  if (type === TransactionType.TRANSFERENCIA) {
    if (!value || !date || !accountId || !targetAccountId) {
      throw new Error(
        "Valor, data, conta de origem e conta de destino são obrigatórios para Transferência."
      );
    }
    const originAccountId = parseInt(accountId);
    const destinationAccountId = parseInt(targetAccountId);

    if (originAccountId === destinationAccountId) {
      throw new Error("A conta de origem e destino não podem ser a mesma.");
    }

    // Usar transação Prisma
    await prisma.$transaction(async (tx) => {
      // Valida conta de origem
      const originAccount = await tx.account.findFirst({
        where: { id: originAccountId, userId: userId },
      });
      if (!originAccount) throw new Error("Conta de origem inválida.");
      // Opcional: Verificar saldo
      if (originAccount.balance < transactionValue)
        throw new Error("Saldo insuficiente na conta de origem.");

      // Valida conta de destino
      const targetAccount = await tx.account.findFirst({
        where: { id: destinationAccountId, userId: userId },
      });
      if (!targetAccount) throw new Error("Conta de destino inválida.");

      // Debita da origem
      await tx.account.update({
        where: { id: originAccountId },
        data: { balance: { decrement: transactionValue } },
      });
      // Credita no destino
      await tx.account.update({
        where: { id: destinationAccountId },
        data: { balance: { increment: transactionValue } },
      });
    });

    return { message: "Transferência realizada com sucesso." };
  }

  // Se nenhum tipo correspondeu
  throw new Error("Tipo de transação inválido fornecido.");
};
