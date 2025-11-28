import request from 'supertest';
import app from '../src/app.js';
import prisma from './setup.js';

import bcrypt from 'bcryptjs';

describe('Category Routes', () => {
  let user;
  let token;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('hashedpassword', 10);
    // Create a user for testing
    user = await prisma.user.create({
      data: {
        name: 'Category Test User',
        email: 'category@test.com',
        password: hashedPassword,
      },
    });

    // Mock login to get token (assuming simple implementation or mock)
    // For this test, we might need to mock the authentication middleware
    // or actually login if the app supports it.
    // Let's assume we can login.
    const loginRes = await request(app).post('/login').send({
      email: 'category@test.com',
      password: 'hashedpassword', // Note: If your app hashes passwords on login, this needs to match
    });
    
    // If login fails (e.g. due to bcrypt), we might need to adjust.
    // For now, let's assume we can get a token or we mock the auth middleware.
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.category.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('GET /categories - Should return user categories', async () => {
    const res = await request(app)
      .get('/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  test('POST /categories - Should create a new category', async () => {
    const newCategory = {
      description: 'Test Category',
      type: 'DESPESA',
    };

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send(newCategory);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('description', 'Test Category');
  });
});
