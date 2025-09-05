import prisma from "../db/client.js";

export const generateForecastLogic = async (userID, data) => {
  const userId = req.user.id;
  const transcations = await prisma.transaction.findMany({
    where: { userId: userId },
    orderBy: { date: "desc" },
  });

  // A partir daqui, eu usaria uma biblioteca de IA (ex: TensorFlow.js)
  // para processar 'transactions' e gerar uma previsão.
  // Por enquanto, vou retornar um valor simulado.
  const futureBalance = 500.0; //Simulação
  const forecastDate = new Date(); //Simulação

  return { futureBalance, forecastDate };
};

export const generateBalanceForecast = async (req, res) => {
  const userId = req.user.id;

  try {
    const { futureBalance, forecastDate } = await generateForecastLogic(userId);

    const newForecast = await prisma.transaction.create({
      data: {
        value: futureBalance,
        date: forecastDate,
        user: {
          connect: { id: userId },
        },
      },
    });

    return res.status(200).json(newForecast);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao gerar previsão." });
  }
};

export const getAllBalanceForecasts = async (req, res) => {
  const userId = req.user.id;

  try {
    const forecast = await prisma.balanceForecast.findMany({
      where: { userId: userId },
      orderBy: { forecastDate: "desc" },
    });

    return res.status(200).json(forecast);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar as previsões." });
  }
};
