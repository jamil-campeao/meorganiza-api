import prisma from "../db/client.js";

export const insertBankStatement = async (req, res) => {
  const userId = req.user.id;
  const { fileName, fileType, importDate } = req.body;

  if (!fileName || !fileType || !importDate) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const newBankStatement = await prisma.bankStatement.create({
      data: {
        fileName: fileName,
        fileType: fileType,
        importDate: new Date(importDate),
        user: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json(newBankStatement);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao criar o extrato bancário." });
  }
};

export const getAllBankStatements = async (req, res) => {
  const userId = req.user.id;

  try {
    const bankStatements = await prisma.bankStatement.findMany({
      where: { userId: userId },
      orderBy: { importDate: "desc" },
    });

    return res.status(200).json(bankStatements);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar os extratos." });
  }
};

export const deleteBankStatement = async (req, res) => {
  const userId = req.user.id;
  const bankStatementId = parseInt(req.params.id);

  if (!bankStatementId) {
    return res
      .status(400)
      .json({ message: "ID do extrato bancário obrigatório." });
  }

  try {
    const banckStatement = await prisma.bankStatement.findUnique({
      where: { id: bankStatementId },
    });

    if (!banckStatement) {
      return res
        .status(404)
        .json({ message: "Extrato bancário não encontrado." });
    }

    if (banckStatement.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Extrato bancário não pertence ao usuário." });
    }

    await prisma.bankStatement.delete({
      where: { id: bankStatementId },
    });

    return res
      .status(200)
      .json({ message: "Extrato bancário excluído com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir o extrato." });
  }
};
