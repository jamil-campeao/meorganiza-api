import prisma from "../db/client.js";
import Papa from "papaparse";

export const uploadBankStatement = async (req, res) => {
  const userId = req.user.id;
  const { accountId, categoryId } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "Nenhum arquivo enviado." });
  }

  if (!accountId || !categoryId) {
    return res
      .status(400)
      .json({ message: "Conta e categoria padrão são obrigatórias." });
  }

  try {
    const fileContent = req.file.buffer.toString("utf-8");

    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const transactionsToCreate = results.data.map((row) => ({
          description: row.Descricao,
          value: parseFloat(row.Valor),
          date: new Date(row.Data),
          type: parseFloat(row.Valor) >= 0 ? "RECEITA" : "DESPESA",
          userId: userId,
          accountId: parseInt(accountId),
          categoryId: parseInt(categoryId),
        }));

        await prisma.transaction.createMany({
          data: transactionsToCreate,
        });

        // Atualiza o saldo da conta
        const totalAmount = transactionsToCreate.reduce(
          (acc, t) => acc + t.value,
          0
        );
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { increment: totalAmount } },
        });

        res
          .status(200)
          .json({ message: "Extrato importado e transações criadas!" });
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao processar o extrato." });
  }
};

export const getAllBankStatements = async (req, res) => {
  // Esta função pode ser mantida para histórico, se desejar.
  // Por enquanto, vamos retornar um array vazio.
  res.status(200).json([]);
};

export const deleteBankStatement = async (req, res) => {
  // Manter se for usar histórico
  res.status(204).send();
};
