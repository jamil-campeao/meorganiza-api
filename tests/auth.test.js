import request from 'supertest';
import app from '../src/app.js'; // Assuming index.js exports the app
import prisma from './setup.js';

describe('Authentication Routes', () => {
  let testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    createCategories: true,
  };

  beforeAll(async () => {
    // Clean up user if exists
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.category.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.category.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  test('POST /users - Should register a new user', async () => {
    const res = await request(app)
      .post('/user')
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', testUser.email);
  });

  test('POST /login - Should login with valid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /login - Should fail with invalid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(res.statusCode).toEqual(401);
  });
});
