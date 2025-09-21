import prisma from "../db/client.js";

export const createBill = async (req, res) => {
  const { description, amount, dueDate, recurring, categoryId } = req.body;
  const userId = parseInt(req.user.id);

  if (!description || !amount || !dueDate || !recurring || !categoryId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const bill = await prisma.bill.create({
      data: {
        description,
        amount,
        dueDate: new Date(dueDate),
        recurring,
        userId,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    return res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllBills = async (req, res) => {
  const userId = parseInt(req.user.id);
  try {
    const bills = await prisma.bill.findMany({
      where: { userId: parseInt(userId) },
      include: {
        category: true,
      },
    });
    return res.json(bills);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const getBillById = async (req, res) => {
  const userId = parseInt(req.user.id);
  const id = parseInt(req.params.id);

  try {
    const bills = await prisma.bill.findFirst({
      where: {
        userId: parseInt(userId),
        id: parseInt(id),
      },
      include: {
        category: true,
      },
    });
    return res.json(bills);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const updateBill = async (req, res) => {
  const id = parseInt(req.params.id);
  const { description, amount, dueDate, isPaid, recurring, categoryId } =
    req.body;
  const userId = parseInt(req.user.id);

  if (!description || !amount || !dueDate || !recurring || !categoryId) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  try {
    const bill = await prisma.bill.findFirst({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
    });

    if (!bill) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    const updatedBill = await prisma.bill.update({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
      data: {
        description,
        amount,
        dueDate: new Date(dueDate),
        isPaid,
        recurring,
        categoryId,
      },
      include: {
        category: true,
      },
    });
    return res.json(updatedBill);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteBill = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = parseInt(req.user.id);

  try {
    const bill = await prisma.bill.findFirst({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
    });

    if (!bill) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    await prisma.bill.delete({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
    });
    return res.status(204).send();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export const alterStatusBill = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = parseInt(req.user.id);

  try {
    const bill = await prisma.bill.findFirst({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
    });

    if (!bill) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    const updatedBill = await prisma.bill.update({
      where: {
        id: parseInt(id),
        userId: parseInt(userId),
      },
      data: {
        active: !bill.active,
      },
      include: {
        category: true,
      },
    });
    return res.json(updatedBill);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
