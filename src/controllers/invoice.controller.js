import prisma from "../db/client.js";

export const getAllInvoices = async (req, res) => {
    const userId = req.user.id;
    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                card: {
                    userId: userId,
                },
            },
            include: {
                card: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [{ year: "desc" }, { month: "desc" }],
        });
        return res.status(200).json(invoices);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar as faturas." });
    }
};

export const getInvoiceById = async (req, res) => {
    const userId = req.user.id;
    const invoiceId = parseInt(req.params.id);

    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                card: {
                    userId: userId,
                },
            },
            include: {
                transactions: {
                    orderBy: {
                        date: "asc"
                    }
                },
                card: true,
            },
        });

        if (!invoice) {
            return res.status(404).json({ message: "Fatura não encontrada." });
        }

        return res.status(200).json(invoice);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar a fatura." });
    }
};

export const payInvoice = async (req, res) => {
    const userId = req.user.id;
    const invoiceId = parseInt(req.params.id);
    const { paymentDate, accountId, categoryId } = req.body;

    if (!paymentDate || !accountId || !categoryId) {
        return res.status(400).json({ message: "Data do pagamento, conta e categoria são obrigatórios." });
    }

    try {
        // Inicia uma transação no banco de dados para garantir a consistência
        const result = await prisma.$transaction(async (prisma) => {
            // 1. Encontra a fatura e verifica se ela pertence ao usuário
            const invoice = await prisma.invoice.findFirst({
                where: { id: invoiceId, card: { userId: userId } },
                include: { card: true }
            });

            if (!invoice) {
                throw new Error("Fatura não encontrada.");
            }
            if (invoice.isPaid) {
                throw new Error("Esta fatura já foi paga.");
            }

            // 2. Cria uma transação de DESPESA na conta informada
            await prisma.transaction.create({
                data: {
                    description: `Pagamento da fatura de ${invoice.card.name}`,
                    value: invoice.totalAmount,
                    date: new Date(paymentDate),
                    type: 'DESPESA',
                    userId: userId,
                    accountId: accountId,
                    categoryId: categoryId
                }
            });
            
            // 3. Debita o valor da conta
            await prisma.account.update({
                where: { id: accountId },
                data: { balance: { decrement: invoice.totalAmount } }
            });

            // 4. Marca a fatura como paga
            const paidInvoice = await prisma.invoice.update({
                where: { id: invoiceId },
                data: { isPaid: true },
            });

            return paidInvoice;
        });

        return res.status(200).json({ message: "Fatura paga com sucesso!", invoice: result });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message || "Erro ao pagar a fatura." });
    }
};