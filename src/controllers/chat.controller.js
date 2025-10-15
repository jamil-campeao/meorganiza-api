import prisma from "../db/client.js";
import fetch from 'node-fetch';

/**
 * Gerencia o envio de mensagens para o n8n e salva o histórico da conversa.
 * Cria uma nova sessão de chat se o conversationId não for fornecido.
 */
export const handleChatMessage = async (req, res) => {
  const userId = req.user.id;
  const { question, conversationId: existingConversationId } = req.body;
  
  const n8nWebhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;

  if (!question) {
    return res.status(400).json({ message: "A mensagem (question) é obrigatória." });
  }

  if (!n8nWebhookUrl) {
    return res.status(500).json({ message: "O Webhook do assistente IA não está configurado no servidor." });
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        conversationId: currentConversationId,
        userId: userId,
      }),
    });

    if (!n8nResponse.ok) {
      // Se o n8n falhar, a transação inteira será revertida.
      const errorBody = await n8nResponse.text();
      throw new Error(`O assistente IA retornou um erro: ${n8nResponse.statusText}. Detalhes: ${errorBody}`);
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
          sender: 'USER',
          chatSessionId: currentConversationId,
        },
      });

      // 2. Salva a resposta da IA no banco de dados
      const savedAiMessage = await tx.chatMessage.create({
        data: {
          content: aiResponseText,
          sender: 'AI',
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
    return res.status(500).json({ message: error.message || "Erro ao processar a mensagem do chat." });
  }
};

/**
 * Busca o histórico de uma sessão de chat específica ou todas as sessões do usuário.
 */
export const getChatHistory = async (req, res) => {
    const userId = req.user.id;
    const { conversationId } = req.params;

    try {
        if (conversationId) {
            // Busca mensagens de uma conversa específica
            const messages = await prisma.chatMessage.findMany({
                where: {
                    chatSessionId: conversationId,
                    chatSession: {
                        userId: userId,
                    }
                },
                orderBy: {
                    createdAt: 'asc'
                },
                select: {
                    content: true,
                    sender: true,
                }
            });

            // Mapeia para o formato { sender, text } que o front-end espera
            const formattedMessages = messages.map(msg => ({
                sender: msg.sender.toLowerCase(),
                text: msg.content,
            }));
            return res.status(200).json(formattedMessages);
        } else {
            // Busca todas as sessões de chat do usuário
            const sessions = await prisma.chatSession.findMany({
                where: { userId: userId },
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: {
                        select: { messages: true }
                    }
                }
            });
            return res.status(200).json(sessions);
        }
    } catch (error) {
        console.error("Erro ao buscar histórico do chat:", error);
        return res.status(500).json({ message: "Erro ao buscar histórico do chat." });
    }
}

