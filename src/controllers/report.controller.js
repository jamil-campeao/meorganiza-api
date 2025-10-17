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
  const userId = req.user?.id;
  const { query } = req.body;
  const n8nWebhookUrl = process.env.N8N_AI_REPORT_WEBHOOK_URL;

  // Validações iniciais
  if (!query) {
    return res.status(400).json({ message: "A pergunta (query) é obrigatória." });
  }

  if (!n8nWebhookUrl) {
    return res.status(500).json({ message: "Webhook de relatórios não configurado." });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minutos

  try {
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, query }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!n8nResponse.ok) {
      // tenta extrair corpo de erro, se existir
      let errorMessage = "Ocorreu um erro ao gerar o relatório no N8N.";
      try {
        const errorBody = await n8nResponse.json();
        errorMessage = errorBody.message || errorMessage;
      } catch {
        // ignora se não for JSON
      }
      throw new Error(errorMessage);
    }

    // Tenta converter o corpo para JSON
    const reportData = await n8nResponse.json();

    if (!Array.isArray(reportData) || !reportData[0]?.output) {
      return res.status(400).json({ message: "Resposta inesperada do N8N." });
    }

    const { title, displayType, data } = reportData[0].output;

    // Salva no banco
    const newReport = await prisma.generatedReport.create({
      data: {
        userId,
        userQuestion: query,
        title,
        displayType,
        data: typeof data === 'object' ? JSON.stringify(data) : data,
      },
    });

    return res.status(201).json(newReport);

  } catch (error) {
    clearTimeout(timeoutId); // segurança extra

    if (error.name === 'AbortError') {
      console.error('Tempo limite atingido ao gerar relatório.');
      return res.status(504).json({ message: 'A geração do relatório demorou demais e foi cancelada.' });
    }

    console.error("Erro no fluxo de relatório AI:", error);
    return res.status(500).json({ message: error.message || "Erro interno no servidor." });
  }
};
