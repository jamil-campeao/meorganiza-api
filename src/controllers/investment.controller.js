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
