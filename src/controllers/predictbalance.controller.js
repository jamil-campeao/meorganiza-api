import fetch from "node-fetch";
import prisma from "../db/client.js";

export const generatePrediction = async (req, res) => {
  const userId = req.user.id;
  const n8nWebhookUrl = process.env.N8N_PREDICTION_WEBHOOK_URL;
  const n8nToken = process.env.N8N_TOKEN;

  if (!n8nWebhookUrl) {
    return res
      .status(500)
      .json({ message: "Webhook de previsão não configurado no servidor." });
  }

  try {
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: n8nToken },
      body: JSON.stringify({ userId: userId }),
    });

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.json();
      throw new Error(
        errorBody.message || "Ocorreu um erro ao gerar a previsão."
      );
    }

    const predictionData = await n8nResponse.json();

    const newForecast = await prisma.balanceForecast.create({
      data: {
        futureBalance: predictionData.output.predicted_balance,
        analysisSummary: predictionData.output.analysis_summary,
        forecastDate: new Date(),
        userId: userId,
      },
    });

    return res.status(200).json(newForecast);
  } catch (error) {
    console.error("Erro no fluxo de previsão:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const getLastPrediction = async (req, res) => {
  const userId = req.user.id;
  try {
    const lastPrediction = await prisma.balanceForecast.findFirst({
      where: { userId: userId },
      orderBy: { forecastDate: "desc" },
    });
    return res.status(200).json(lastPrediction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar a previsão." });
  }
};
