import bcrypt from "bcryptjs";
import prisma from "../db/client.js";

export const insertUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const userAlreadyExists = await prisma.user.findUnique({
      where: { email: email },
    });

    if (userAlreadyExists) {
      return res.status(400).json({ message: "O usuário já existe." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao criar o usuário." });
  }
};

export const getUser = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        notificationPreference: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao buscar o usuário." });
  }
};

export const updateUser = async (req, res) => {
  const userId = req.user.id;
  const { name, notificationPreference } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },

      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        notificationPreference: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const updateData = { name };

    if (notificationPreference) {
      updateData.notificationPreference = notificationPreference;
    }

    const updateUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = updateUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao atualizar o usuário." });
  }
};

export const updateStatus = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const updateStatusUser = await prisma.user.update({
      where: { id: userId },
      data: { active: !user.active },
    });

    const { password: _, ...userWithoutPassword } = updateStatusUser;

    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao atualizar o usuário." });
  }
};

export const updatePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "A senha atual e a nova senha são obrigatórias." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Senha atual incorreta." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatePasswordUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao atualizar a senha." });
  }
};
