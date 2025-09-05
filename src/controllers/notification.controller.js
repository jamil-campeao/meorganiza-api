import prisma from "../db/client.js";

export const insertNotification = async (req, res) => {
  const userId = req.user.id;
  const { message } = req.body;

  if (!message) {
    return res
      .status(400)
      .json({ message: "A mensagem da notificação é obrigatória." });
  }

  try {
    const newNotification = await prisma.notification.create({
      data: {
        message: message,
        user: {
          connect: { id: userId },
        },
      },
    });

    return res.status(201).json(newNotification);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao criar a notificação." });
  }
};

export const getAllNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { sentAt: "desc" },
    });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar as notificações." });
  }
};

export const markNotificationAsRead = async (req, res) => {
  const userId = req.user.id;
  const notificationId = parseInt(req.params.id);

  if (!notificationId) {
    res.status(400).json({ message: "ID da notificação obrigatório." });
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada." });
    }

    if (notification.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Notificação não pertence ao usuário." });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return res.status(200).json(updatedNotification);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao marcar a notificação como lida." });
  }
};

export const deleteNotification = async (req, res) => {
  const userId = req.user.id;
  const notificationId = parseInt(req.params.id);

  if (!notificationId) {
    return res.status(400).json({ message: "ID da notificação obrigatório." });
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada." });
    }

    if (notification.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Notificação não pertence ao usuário." });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return res.status(200).json({
      message: "Notificação excluída com sucesso.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir a notificação." });
  }
};
