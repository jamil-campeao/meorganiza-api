import prisma from "../db/client.js";
import fetch from "node-fetch";

/**
 * Gerencia o envio de mensagens para o n8n e salva o histórico da conversa.
 * Cria uma nova sessão de chat se o conversationId não for fornecido.
 */
export const handleChatMessage = async (req, res) => {
  const userId = req.user.id;
  const { question, conversationId: existingConversationId } = req.body;

  const n8nWebhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;
  const n8ntoken = process.env.N8N_TOKEN;

  if (!question) {
    return res
      .status(400)
      .json({ message: "A mensagem (question) é obrigatória." });
  }

  if (!n8nWebhookUrl) {
    return res
      .status(500)
      .json({
        message: "O Webhook do assistente IA não está configurado no servidor.",
      });
  }

  try {
    let currentConversationId = existingConversationId;

    // Se não houver ID de conversa, é uma nova conversa. Crie a sessão primeiro.
    if (!currentConversationId) {
      const newSession = await prisma.chatSession.create({
        data: {
          userId: userId,
        },
      });
      currentConversationId = newSession.id;
    }

    // Envia a pergunta para o n8n e aguarda a resposta da IA
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: n8ntoken },
      body: JSON.stringify({
        question: question,
        conversationId: currentConversationId,
        userId: userId,
      }),
    });

    if (!n8nResponse.ok) {
      // Se o n8n falhar, a transação inteira será revertida.
      const errorBody = await n8nResponse.text();
      throw new Error(
        `O assistente IA retornou um erro: ${n8nResponse.statusText}. Detalhes: ${errorBody}`
      );
    }

    const aiData = await n8nResponse.json();
    const aiResponseText = aiData.output.prompt;

    if (!aiResponseText) {
      throw new Error("O assistente IA retornou uma resposta vazia.");
    }

    // Uso uma transação para garantir que a pergunta e a resposta sejam salvas juntas.
    const aiResponse = await prisma.$transaction(async (tx) => {
      // 1. Salva a mensagem do usuário no banco de dados
      await tx.chatMessage.create({
        data: {
          content: question,
          sender: "USER",
          chatSessionId: currentConversationId,
        },
      });

      // 2. Salva a resposta da IA no banco de dados
      const savedAiMessage = await tx.chatMessage.create({
        data: {
          content: aiResponseText,
          sender: "AI",
          chatSessionId: currentConversationId,
        },
      });

      return savedAiMessage;
    });

    // 4. Retorna a resposta da IA e o ID da conversa para o front-end
    return res.status(200).json({
      text: aiResponse.content,
      conversationId: currentConversationId,
    });
  } catch (error) {
    console.error("Erro no fluxo do chat:", error);
    return res
      .status(500)
      .json({
        message: error.message || "Erro ao processar a mensagem do chat.",
      });
  }
};

/**
 * Busca o histórico de uma sessão de chat específica ou todas as sessões do usuário.
 */
export const getLastActiveChat = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  try {
    if (conversationId) {
      console.log("ENTREI AQUI NESSE PRIMEIRO IF");
      // Busca mensagens de uma conversa específica
      const messages = await prisma.chatMessage.findFirst({
        where: {
          chatSessionId: conversationId,
          chatSession: {
            userId: userId,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          content: true,
          sender: true,
        },
      });

      // Mapeia para o formato { sender, text } que o front-end espera
      const formattedMessages = messages.map((msg) => ({
        sender: msg.sender.toLowerCase(),
        text: msg.content,
      }));
      return res.status(200).json(formattedMessages);
    } else {
      // Busca todas as sessões de chat do usuário
      const sessions = await prisma.chatSession.findMany({
        where: { userId: userId, active: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          updatedAt: true,
          messages: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              sender: true,
              content: true,
            },
          },
        },
      });

      if (!sessions || sessions.length === 0) {
        return res
          .status(404)
          .json({ message: "Nenhuma sessão de chat encontrada." });
      }

      const formattedSessions = sessions.map((session) => {
        return {
          ...session,
          messages: session.messages.map((message) => {
            return {
              sender: message.sender,
              text: message.content,
            };
          }),
        };
      });

      return res.status(200).json(formattedSessions);
    }
  } catch (error) {
    console.error("Erro ao buscar histórico do chat:", error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar histórico do chat." });
  }
};

export const finishChat = async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.body;

  try {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: conversationId,
        userId: userId,
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({
          message:
            "Sessão de chat não encontrada ou não pertence a este usuário.",
        });
    }

    await prisma.chatSession.update({
      where: {
        id: conversationId,
      },
      data: { active: false },
    });

    return res
      .status(200)
      .json({ message: "Conversa finalizada com sucesso." });
  } catch (error) {
    console.error("Erro ao finalizar chat:", error);
    return res.status(500).json({ message: "Erro ao finalizar chat." });
  }
};
