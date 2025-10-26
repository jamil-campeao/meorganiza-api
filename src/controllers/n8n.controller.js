import prisma from "../db/client.js";

export const getTypeConversation = async (req, res) => {
  try {
    const { id } = req.query;
    const typeConversation = await prisma.chatSession.findUnique({
      where: { id },
    });

    if (!typeConversation) {
      return res.status(404).json({ message: "Conversa não encontrada" });
    }

    const data = {
      type: typeConversation.type,
    };

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar o tipo da conversa." });
  }
};
