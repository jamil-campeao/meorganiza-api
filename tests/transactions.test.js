import request from 'supertest';
import app from '../src/app.js';
import prisma from './setup.js';

import bcrypt from 'bcryptjs';

describe('Transaction Routes', () => {
  let user;
  let token;
  let category;
  let account;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password', 10);
    user = await prisma.user.create({
      data: {
        name: 'Transaction Test User',
        email: 'transaction@test.com',
        password: hashedPassword,
      },
    });

    // Create dependencies
    category = await prisma.category.create({
      data: {
        description: 'Test Category',
        type: 'DESPESA',
        userId: user.id,
      },
    });

    // Need a bank for account
    const bank = await prisma.bank.upsert({
        where: { id: '001' },
        update: {},
        create: { id: '001', name: 'Test Bank' }
    });

    account = await prisma.account.create({
      data: {
        name: 'Test Account',
        type: 'CONTA_CORRENTE',
        balance: 1000,
        userId: user.id,
        bankId: bank.id,
      },
    });

    const loginRes = await request(app).post('/login').send({
      email: 'transaction@test.com',
      password: 'password',
    });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.category.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('POST /transactions - Should create a transaction', async () => {
    const transaction = {
      description: 'Test Transaction',
      value: 50.00,
      date: new Date(),
      type: 'DESPESA',
      categoryId: category.id,
      accountId: account.id,
    };

    const res = await request(app)
      .post('/transaction')
      .set('Authorization', `Bearer ${token}`)
      .send(transaction);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
  });

  test('GET /transactions - Should list transactions', async () => {
    const res = await request(app)
      .get('/transaction')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });
});
