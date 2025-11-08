import prisma from "../db/client.js";
import { InvestmentType } from "@prisma/client";

export const insertInvestment = async (req, res) => {
  const userId = req.user.id;
  const {
    type, // Ex: "ACAO", "RENDA_FIXA_CDI"
    description, // Ex: "PETR4", "CDB Neon 110%"
    acquisitionDate,
    quantity, // Para ACAO, FII, TESOURO
    acquisitionValue, // Para ACAO, FII, TESOURO
    initialAmount, // Para RENDA_FIXA_CDI, POUPANCA
    indexer, // Ex: "CDI", "IPCA"
    rate, // Ex: 110 (para 110%), 6.5 (para 6.5%)
    maturityDate, // Opcional
  } = req.body;

  if (!type || !description || !acquisitionDate) {
    return res.status(400).json({
      message: "Tipo, descrição e data de aquisição são obrigatórios.",
    });
  }

  // 2. Validação se o 'type' enviado existe no Enum do Prisma
  if (!Object.values(InvestmentType).includes(type)) {
    return res
      .status(400)
      .json({ message: `Tipo de investimento inválido: ${type}` });
  }

  // 3. Objeto de dados base para o Prisma
  const data = {
    type: type, // O Prisma aceita a string "ACAO", etc.
    description: description,
    acquisitionDate: new Date(acquisitionDate),
    user: {
      connect: { id: userId },
    },
  };

  try {
    // 4. Validação e adição de campos específicos por tipo
    switch (type) {
      case InvestmentType.ACAO:
      case InvestmentType.FII:
      case InvestmentType.TESOURO_DIRETO:
        if (quantity === undefined || acquisitionValue === undefined) {
          return res.status(400).json({
            message:
              "Quantidade e Valor de Aquisição são obrigatórios para Ação, FII ou Tesouro Direto.",
          });
        }
        data.quantity = parseFloat(quantity);
        data.acquisitionValue = parseFloat(acquisitionValue);
        break;

      case InvestmentType.RENDA_FIXA_CDI:
        if (initialAmount === undefined || !indexer || rate === undefined) {
          return res.status(400).json({
            message:
              "Valor Inicial, Indexador (ex: CDI) e Taxa (ex: 110) são obrigatórios para Renda Fixa.",
          });
        }
        data.initialAmount = parseFloat(initialAmount);
        data.indexer = indexer;
        data.rate = parseFloat(rate);
        if (maturityDate) {
          data.maturityDate = new Date(maturityDate);
        }
        break;

      case InvestmentType.POUPANCA:
      case InvestmentType.OUTRO:
        if (initialAmount === undefined) {
          return res.status(400).json({
            message: "Valor Inicial é obrigatório para Poupança ou Outros.",
          });
        }
        data.initialAmount = parseFloat(initialAmount);
        if (maturityDate) {
          data.maturityDate = new Date(maturityDate);
        }
        break;

      default:
        return res
          .status(400)
          .json({ message: "Tipo de investimento não suportado." });
    }

    // 5. Criação do Investimento
    const newInvestment = await prisma.investment.create({
      data: data,
    });

    return res.status(201).json(newInvestment);
  } catch (error) {
    console.error("Erro ao inserir o investimento:", error);
    // Pega erros de validação do Prisma (ex: tipo de dado errado)
    if (error.code) {
      return res
        .status(400)
        .json({ message: `Erro de dados: ${error.message}` });
    }
    return res
      .status(500)
      .json({ message: "Erro interno ao inserir o investimento." });
  }
};

export const getAllInvestments = async (req, res) => {
  const userId = req.user.id;

  try {
    const investments = await prisma.investment.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        acquisitionDate: "desc",
      },
    });

    return res.status(200).json(investments);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar os investimentos." });
  }
};

export const getInvestmentById = async (req, res) => {
  const investmentId = parseInt(req.params.id);

  try {
    const investment = await prisma.investment.findUnique({
      where: {
        id: investmentId,
      },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    return res.status(200).json(investment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar o investimento." });
  }
};

export const updateInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);
  const {
    type,
    description,
    acquisitionDate,
    quantity,
    acquisitionValue,
    initialAmount,
    indexer,
    rate,
    maturityDate,
  } = req.body;

  try {
    // 2. Verificar se o investimento existe e pertence ao usuário
    const investment = await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId: userId,
      },
    });

    if (!investment) {
      return res.status(404).json({
        message: "Investimento não encontrado ou não pertence a este usuário.",
      });
    }

    // 3. Construir o objeto 'data' dinamicamente
    //    Isso permite atualizações parciais (ex: enviar só o 'rate')
    const dataToUpdate = {};

    // Se 'type' for enviado, validar se ele existe no Enum
    if (type !== undefined) {
      if (!Object.values(InvestmentType).includes(type)) {
        return res
          .status(400)
          .json({ message: `Tipo de investimento inválido: ${type}` });
      }
      dataToUpdate.type = type;
    }

    if (description !== undefined) dataToUpdate.description = description;
    if (acquisitionDate !== undefined)
      dataToUpdate.acquisitionDate = new Date(acquisitionDate);
    if (indexer !== undefined) dataToUpdate.indexer = indexer;

    // --- Campos Numéricos ---
    if (quantity !== undefined) dataToUpdate.quantity = parseFloat(quantity);
    if (acquisitionValue !== undefined)
      dataToUpdate.acquisitionValue = parseFloat(acquisitionValue);
    if (initialAmount !== undefined)
      dataToUpdate.initialAmount = parseFloat(initialAmount);
    if (rate !== undefined) dataToUpdate.rate = parseFloat(rate);

    // --- Campos de Data Opcionais (Permitir 'null') ---
    if (maturityDate === null) {
      dataToUpdate.maturityDate = null;
    } else if (maturityDate !== undefined) {
      // Se enviar uma data, atualiza
      dataToUpdate.maturityDate = new Date(maturityDate);
    }
    // 4. Executar a atualização no banco de dados
    const updatedInvestment = await prisma.investment.update({
      where: { id: investmentId },
      data: dataToUpdate,
    });

    return res.status(200).json(updatedInvestment);
  } catch (error) {
    console.error("Erro ao atualizar o investimento:", error);
    // Pega erros de validação do Prisma (ex: tipo de dado errado)
    if (error.code) {
      return res
        .status(400)
        .json({ message: `Erro de dados: ${error.message}` });
    }
    return res
      .status(500)
      .json({ message: "Erro interno ao atualizar o investimento." });
  }
};

export const deleteInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    await prisma.investment.delete({
      where: { id: investmentId },
    });

    return res
      .status(200)
      .json({ message: "Investimento excluído com sucesso." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao excluir o investimento." });
  }
};

export const inactiveInvestment = async (req, res) => {
  const userId = req.user.id;
  const investmentId = parseInt(req.params.id);

  if (!investmentId) {
    return res.status(400).json({ message: "ID do investimento obrigatório." });
  }

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    if (investment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Investimento não pertence ao usuário." });
    }

    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        active: investment.active ? false : true,
      },
    });

    return res
      .status(200)
      .json({ message: "Status do investimento alterado." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao alterar status do investimento." });
  }
};

/**
 * Formata um objeto Date para o padrão 'dd/MM/yyyy'.
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} - A data formatada.
 */
const formatDateToBCB = (date) => {
  // Usamos 'pt-BR' e 'numeric' para garantir o formato correto
  const options = {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "America/Sao_Paulo", // Garante a data correta
  };
  // Intl.DateTimeFormat pode vir com '2-digit', então forçamos com split/join
  const parts = new Intl.DateTimeFormat("pt-BR", options)
    .format(date)
    .split("/");
  return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${
    parts[2]
  }`;
};

/**
 * Busca o índice de uma série do BCB (SGS) em um intervalo de datas.
 * @param {string} seriesId - O ID da série (ex: "4391" para CDI).
 * @param {string} dataInicialFormatada - Data inicial (dd/MM/yyyy).
 * @param {string} dataFinalFormatada - Data final (dd/MM/yyyy).
 * @returns {Promise<Array<object>|null>} - Os dados da série ou null em caso de erro.
 */
const fetchBCBSeries = async (
  seriesId,
  dataInicialFormatada,
  dataFinalFormatada
) => {
  try {
    console.log(`Buscando série ${seriesId} do BCB...`);
    console.log(`Intervalo: ${dataInicialFormatada} a ${dataFinalFormatada}`);
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${dataInicialFormatada}&dataFinal=${dataFinalFormatada}`;
    console.log(`URL: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      console.error(
        `Erro ao buscar série ${seriesId} do BCB: ${response.statusText}`
      );
      return null;
    }
    const data = await response.json();
    console.log(`Dados recebidos da série ${seriesId}:`, data);
    return data && data.length > 0 ? data : null;
  } catch (error) {
    console.error(`Falha no fetch da série ${seriesId} do BCB:`, error);
    return null;
  }
};

// --- FIM: Funções Utilitárias ---

export const getInvestmentSummary = async (req, res) => {
  const userId = req.user.id;

  try {
    const userInvestments = await prisma.investment.findMany({
      where: {
        userId: userId,
        active: true,
      },
    });

    if (userInvestments.length === 0) {
      return res.status(200).json([]);
    }

    // --- ETAPA 1: Buscar dados externos (Cotações e Índices) ---
    // (Este é o primeiro .map que estava com o 'switch')
    const dataFetchPromises = userInvestments.map(async (inv) => {
      try {
        switch (inv.type) {
          case "ACAO":
          case "FII":
            const brapiQuoteResponse = await fetch(
              `https://brapi.dev/api/quote/${inv.description}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${process.env.BRAPI_TOKEN}`,
                },
              }
            );
            if (!brapiQuoteResponse.ok) {
              return { ...inv, apiData: { currentPrice: null } };
            }
            const brapiData = await brapiQuoteResponse.json();
            const currentPrice =
              brapiData.results?.[0]?.regularMarketPrice || null;
            return { ...inv, apiData: { currentPrice } };

          // case "TESOURO_DIRETO":
          //   // A API gratuita da Brapi para o Tesouro!
          //   const brapiTreasuryResponse = await fetch(
          //     `https://brapi.dev/api/v2/treasury?search=${inv.description}`,
          //     {
          //       method: "GET",
          //       headers: {
          //         Authorization: `Bearer ${process.env.BRAPI_TOKEN}`,
          //       },
          //     }
          //   );
          //   if (!brapiTreasuryResponse.ok) {
          //     return { ...inv, apiData: { currentPrice: null } };
          //   }
          //   const treasuryData = await brapiTreasuryResponse.json();
          //   // Pega o primeiro resultado que bate com a busca
          //   const unitPrice = treasuryData.results?.[0]?.unitPrice || null;
          //   return { ...inv, apiData: { currentPrice: unitPrice } };

          case "RENDA_FIXA_CDI":
            const dataInicialFormatada = formatDateToBCB(inv.acquisitionDate);
            const dataFinalFormatada = formatDateToBCB(new Date()); // Hoje

            // Busca o intervalo de índices do CDI (Série 4391)
            const bcbData = await fetchBCBSeries(
              "4391",
              dataInicialFormatada,
              dataFinalFormatada
            );

            if (!bcbData) {
              return {
                ...inv,
                apiData: { indiceInicial: null, indiceFinal: null },
              };
            }

            console.log(`Índices CDI obtidos:`, bcbData);

            // O primeiro item é o índice da data inicial
            const indiceInicial = parseFloat(bcbData[0].valor);
            // O último item é o índice da data final (hoje)
            const indiceFinal = parseFloat(bcbData[bcbData.length - 1].valor);

            return { ...inv, apiData: { indiceInicial, indiceFinal } };

          default:
            // Tipos não reconhecidos ou sem cotação (ex: POUPANCA)
            return { ...inv, apiData: {} };
        }
      } catch (error) {
        console.error(
          `Falha ao processar ${inv.type} ${inv.description}:`,
          error
        );
        return { ...inv, apiData: {} }; // Retorna o básico em caso de falha
      }
    });

    // Executa todas as buscas de API em paralelo
    const investmentsWithApiData = await Promise.all(dataFetchPromises);

    // --- ETAPA 2: Calcular valores finais com os dados obtidos ---
    // (Este é o segundo .map, que faz os cálculos)
    const enrichedInvestments = investmentsWithApiData.map((inv) => {
      let totalValue = 0;
      let totalInvested = 0;
      let profit = 0;
      let profitPercent = 0;
      let currentPrice = null; // Para Ação/FII/Tesouro

      switch (inv.type) {
        case "ACAO":
        case "FII":
          // case "TESOURO_DIRETO":
          const acquisitionValue = parseFloat(inv.acquisitionValue);
          const quantity = parseFloat(inv.quantity);
          currentPrice = inv.apiData.currentPrice || acquisitionValue; // Se falhar, usa o valor de aquisição

          totalInvested = acquisitionValue * quantity;
          totalValue = currentPrice * quantity;
          profit = totalValue - totalInvested;
          profitPercent =
            totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
          break;

        case "RENDA_FIXA_CDI":
          const initialAmount = parseFloat(inv.initialAmount);
          const rate = parseFloat(inv.rate || 100) / 100; // ex: 110% -> 1.1 (default 100%)
          totalInvested = initialAmount;

          const { indiceInicial, indiceFinal } = inv.apiData;

          if (indiceInicial && indiceFinal && indiceInicial > 0) {
            // Calcula a rentabilidade bruta do 100% CDI no período
            const rentabilidadeCDI = indiceFinal / indiceInicial - 1;
            // Aplica a taxa do investimento (ex: 110% do CDI)
            const rentabilidadeBruta = rentabilidadeCDI * rate;
            // Valor total = Valor inicial + rentabilidade
            totalValue = initialAmount * (1 + rentabilidadeBruta);
          } else {
            // Se falhou a busca no BCB, retorna o valor investido
            totalValue = initialAmount;
          }

          profit = totalValue - totalInvested;
          profitPercent =
            totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
          break;

        default:
          // POUPANCA ou OUTRO (trata como valor estático)
          totalInvested = parseFloat(
            inv.initialAmount || inv.acquisitionValue * inv.quantity
          );
          totalValue = totalInvested;
          profit = 0;
          profitPercent = 0;
          break;
      }

      // Retorna o objeto final formatado
      return {
        id: inv.id,
        description: inv.description,
        type: inv.type,
        quantity: parseFloat(inv.quantity),
        acquisitionValue: parseFloat(inv.acquisitionValue),
        initialAmount: parseFloat(inv.initialAmount), // Para Renda Fixa
        currentPrice: currentPrice, // Para Renda Variável/Tesouro
        totalValue: totalValue,
        profit: profit,
        profitPercent: profitPercent,
      };
    });

    return res.status(200).json(enrichedInvestments);
  } catch (error) {
    console.error("Erro ao gerar resumo de investimentos:", error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar o resumo dos investimentos." });
  }
};
