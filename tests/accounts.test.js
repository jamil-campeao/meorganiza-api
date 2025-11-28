import request from 'supertest';
import app from '../src/app.js';
import prisma from './setup.js';

import bcrypt from 'bcryptjs';

describe('Account Routes', () => {
  let user;
  let token;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password', 10);
    user = await prisma.user.create({
      data: {
        name: 'Account Test User',
        email: 'account@test.com',
        password: hashedPassword,
      },
    });

    // Ensure bank exists
    await prisma.bank.upsert({
        where: { id: '001' },
        update: {},
        create: { id: '001', name: 'Test Bank' }
    });

    const loginRes = await request(app).post('/login').send({
      email: 'account@test.com',
      password: 'password',
    });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('POST /accounts - Should create a new account', async () => {
    const account = {
      name: 'My Bank Account',
      type: 'CONTA_CORRENTE',
      balance: 500.00,
      bankId: '001',
    };

    const res = await request(app)
      .post('/account')
      .set('Authorization', `Bearer ${token}`)
      .send(account);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('name', 'My Bank Account');
  });

  test('GET /accounts - Should list accounts', async () => {
    const res = await request(app)
      .get('/account')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });
});
