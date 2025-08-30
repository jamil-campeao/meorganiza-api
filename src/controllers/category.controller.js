import prisma from "../db/client.js";
import { TransactionType } from "@prisma/client";

export const insertCategory = async (req, res) => {
  const userId = req.user.id;
  const { description, type } = req.body;

  if (!description || !type) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const newCategory = await prisma.category.create({
      data: {
        description: description,
        type: TransactionType[type],
        userId: userId,
      },
    });

    return res.status(201).json(newCategory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao inserir a categoria." });
  }
};

export const getAllCategories = async (req, res) => {
  const userId = req.user.id;

  try {
    const categories = await prisma.category.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        description: "asc",
      },
    });

    return res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar as categorias." });
  }
};

export const getCategoryById = async (req, res) => {
  const categoryId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (category.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Categoria não pertence ao usuário." });
    }

    return res.status(200).json(category);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar a categoria." });
  }
};

export const updateCategory = async (req, res) => {
  const userId = req.user.id;
  const categoryId = parseInt(req.params.id);
  const { description, type } = req.body;

  if (!description || !type) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    console.log(category.userId);
    console.log(userId);
    if (category.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Categoria não pertence ao usuário." });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        description,
        type: TransactionType[type],
      },
    });

    return res.status(200).json(updatedCategory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar a categoria." });
  }
};

export const deleteCategory = async (req, res) => {
  const userId = req.user.id;
  const categoryId = parseInt(req.params.id);

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    if (category.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Categoria não pertence ao usuário." });
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return res.status(200).json({ message: "Categoria excluída com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir a categoria." });
  }
};

export const inactiveCategory = async (req, res) => {
  const userId = req.user.id;
  const categoryId = parseInt(req.params.id);

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    if (category.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Categoria não pertence ao usuário." });
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        active: category.active ? false : true,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao alterar status da categoria." });
  }
};
