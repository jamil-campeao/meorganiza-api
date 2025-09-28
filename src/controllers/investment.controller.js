import prisma from "../db/client.js";

export const insertInvestment = async (req, res) => {
  const userId = req.user.id;
  const { type, description, quantity, acquisitionValue, acquisitionDate } =
    req.body;

  if (
    !type ||
    !description ||
    !quantity ||
    !acquisitionValue ||
    !acquisitionDate
  ) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const newInvestment = await prisma.investment.create({
      data: {
        type: type,
        description: description,
        quantity: parseFloat(quantity),
        acquisitionValue: parseFloat(acquisitionValue),
        acquisitionDate: new Date(acquisitionDate),
        user: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json(newInvestment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir o investimento." });
  }
};

export const getAllInvestments = async (req, res) => {
  const userId = req.user.id;

  try {
    const investments = await prisma.investment.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        acquisitionDate: "desc",
      },
    });

    return res.status(200).json(investments);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar os investimentos." });
  }
};

export const getInvestmentById = async (req, res) => {
  const investmentId = parseInt(req.params.id);

  try {
    const investment = await prisma.investment.findUnique({
      where: {
        id: investmentId,
      },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    return res.status(200).json(investment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar o investimento." });
  }
};

export const updateInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);
  const { type, description, quantity, acquisitionValue, acquisitionDate } =
    req.body;

  if (
    !type ||
    !description ||
    !quantity ||
    !acquisitionValue ||
    !acquisitionDate
  ) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    const updatedInvestment = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        type: type || investment.type,
        description: description || investment.description,
        quantity: quantity ? parseFloat(quantity) : investment.quantity,
        acquisitionValue:
          parseFloat(acquisitionValue) || investment.acquisitionValue,
        acquisitionDate: acquisitionDate
          ? new Date(acquisitionDate)
          : investment.acquisitionDate,
      },
    });

    return res.status(200).json({
      message: "Investimento atualizado com sucesso.",
      investment: updatedInvestment,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar o investimento." });
  }
};

export const deleteInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    await prisma.investment.delete({
      where: { id: investmentId },
    });

    return res
      .status(200)
      .json({ message: "Investimento excluído com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir o investimento." });
  }
};

export const inactiveInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);

  if (!investmentId) {
    return res.status(400).json({ message: "ID do investimento obrigatório." });
  }

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        active: investment.active ? false : true,
      },
    });

    return res
      .status(200)
      .json({ message: "Status do investimento alterado." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao alterar status do investimento." });
  }
};

export const getInvestmentSummary = async (req, res) => {
  const userId = req.user.id;

  try {
    const userInvestments = await prisma.investment.findMany({
      where: {
        userId: userId,
        active: true,
      },
    });

    if (userInvestments.length === 0) {
      return res.status(200).json([]);
    }

    // Crio uma "promessa" para cada chamada à API da Brapi
    const promises = userInvestments.map((inv) => {
      return fetch(`https://brapi.dev/api/quote/${inv.description}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BRAPI_TOKEN}`,
        },
      })
        .then((response) => {
          // Se a resposta não for OK, trato como cotação não encontrada
          if (!response.ok) {
            return { regularMarketPrice: null };
          }
          return response.json();
        })
        .then((brapiData) => {
          // Extrai o preço do resultado ou retorna null se não encontrar
          const currentPrice =
            brapiData.results?.[0]?.regularMarketPrice || null;
          return {
            ...inv, // Mantém os dados originais do seu banco
            currentPrice: currentPrice, // Adiciona o preço atual
          };
        })
        .catch((error) => {
          console.error(
            `Falha ao buscar cotação para ${inv.description}:`,
            error
          );
          // Em caso de erro, continua com os dados originais e preço nulo
          return {
            ...inv,
            currentPrice: null,
          };
        });
    });

    // Executo todas as promessas em paralelo
    const investmentsWithPrices = await Promise.all(promises);

    // Calculo os valores finais com base nos preços obtidos
    const enrichedInvestments = investmentsWithPrices.map((inv) => {
      const acquisitionValue = parseFloat(inv.acquisitionValue);
      const quantity = parseFloat(inv.quantity);

      // Se o preço atual não foi encontrado, uso o valor de aquisição para o cálculo
      const currentPrice = inv.currentPrice || acquisitionValue;

      const totalInvested = acquisitionValue * quantity;
      const totalValue = currentPrice * quantity;
      const profit = totalValue - totalInvested;
      const profitPercent =
        totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

      return {
        id: inv.id,
        description: inv.description,
        type: inv.type,
        quantity: quantity,
        acquisitionValue: acquisitionValue,
        currentPrice: currentPrice,
        totalValue: totalValue,
        profit: profit,
        profitPercent: profitPercent,
      };
    });

    return res.status(200).json(enrichedInvestments);
  } catch (error) {
    console.error("Erro ao gerar resumo de investimentos:", error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar o resumo dos investimentos." });
  }
};
