import prisma from "../db/client.js";
import { TransactionType } from "@prisma/client";

/**
 * Relatório de Despesas Agrupadas por Categoria
 * Aceita um período via query params (startDate, endDate)
 */
export const getExpensesByCategory = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "As datas de início e fim são obrigatórias." });
  }

  try {
    const expenses = await prisma.transaction.groupBy({
      by: ["categoryId"],
      _sum: {
        value: true,
      },
      where: {
        userId: userId,
        type: TransactionType.DESPESA,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    // Para enriquecer os dados com o nome da categoria
    const categoryIds = expenses.map((e) => e.categoryId);
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
      },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.description]));

    const reportData = expenses.map((item) => ({
      name: categoryMap.get(item.categoryId) || "Sem Categoria",
      value: parseFloat(item._sum.value),
    }));

    return res.status(200).json(reportData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao gerar o relatório de despesas por categoria.",
    });
  }
};

/**
 * Relatório de Receitas vs. Despesas Mensal
 * Agrega os totais de receitas e despesas para cada mês em um período.
 */
export const getMonthlySummary = async (req, res) => {
  const userId = req.user.id;
  const { year } = req.query;

  if (!year) {
    return res
      .status(400)
      .json({ message: "O ano é um parâmetro obrigatório." });
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31T23:59:59`),
        },
      },
      select: {
        value: true,
        type: true,
        date: true,
      },
    });

    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    // Inicializa o resumo para todos os meses do ano
    const monthlySummary = monthNames.map((monthName) => ({
      month: monthName,
      receitas: 0,
      despesas: 0,
    }));

    transactions.forEach((t) => {
      const monthIndex = new Date(t.date).getMonth(); // 0 = Jan, 1 = Fev, ...
      const value = parseFloat(t.value);

      if (t.type === TransactionType.RECEITA) {
        monthlySummary[monthIndex].receitas += value;
      } else if (t.type === TransactionType.DESPESA) {
        monthlySummary[monthIndex].despesas += value;
      }
    });

    return res.status(200).json(monthlySummary);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao gerar o resumo mensal." });
  }
};

export const generateAIReport = async (req, res) => {
  const userId = req.user.id;
  const { query } = req.body;
  const n8nWebhookUrl = process.env.N8N_AI_REPORT_WEBHOOK_URL;

  if (!question) {
    return res.status(400).json({ message: "A question é obrigatória." });
  }

  if (!n8nWebhookUrl) {
    return res.status(500).json({ message: "Webhook de relatórios não configurado." });
  }

  try {
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, query }),
    });

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.json();
      throw new Error(errorBody.message || "Ocorreu um erro ao gerar o relatório.");
    }

    const reportData = await n8nResponse.json();

    if (!reportData || !reportData.output) {
      return res.status(400).json({ message: "Ocorreu um erro ao gerar o relatório." });
    }

    const { title, displayType, data } = aiResponse.output;

    const newReport = await prisma.generatedReport.create({
      data: {
        userId,
        userQuestion,
        title,
        displayType,
        data,
      },
    });

    return res.status(201).json(newReport);

  } catch (error) {
    console.error("Erro no fluxo de relatório AI:", error);
    return res.status(500).json({ message: error.message });
  }
};