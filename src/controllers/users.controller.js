import bcrypt from "bcryptjs";
import prisma from "../db/client.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

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

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(200).json({
        message:
          "Se o e-mail estiver cadastrado, um link de redefinição foi enviado.",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.userToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.userToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // URL do seu front-end que receberá o token
    const resetLink = `http://meorganiza.app.br/reset-password/${token}`;

    await transporter.sendMail({
      from: '"MeOrganiza" <noreply@meorganiza.com>',
      to: email,
      subject: "Recuperação de Senha - MeOrganiza",
      html: `
        <p>Você solicitou a redefinição de senha.</p>
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Este link expira em 1 hora.</p>
      `,
    });
    // --- FIM DA LÓGICA DO NODEMAILER ---

    return res.status(200).json({
      message:
        "Se o e-mail estiver cadastrado, um link de redefinição foi enviado.",
    });
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    return res
      .status(500)
      .json({ message: "Erro interno ao processar a solicitação." });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "A nova senha é obrigatória." });
  }

  try {
    // 1. Encontrar o token no banco
    const userToken = await prisma.userToken.findUnique({
      where: { token },
    });

    if (!userToken) {
      return res.status(400).json({ message: "Token inválido ou expirado." });
    }

    // 2. Verificar se o token expirou
    if (new Date() > userToken.expiresAt) {
      // Opcional: deletar o token expirado
      await prisma.userToken.delete({ where: { id: userToken.id } });
      return res.status(400).json({ message: "Token inválido ou expirado." });
    }

    // 3. Criptografar a nova senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Atualizar a senha do usuário e deletar o token em uma transação
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.userToken.delete({
        where: { id: userToken.id },
      }),
    ]);

    return res.status(200).json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao redefinir a senha." });
  }
};
