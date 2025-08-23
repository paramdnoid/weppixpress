import app from '../server.js';
import { expect } from 'chai';
import request from 'supertest';

// tests/auth.test.js

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('Check your E-Mail');
    });

    it('should reject invalid email', async () => {
      const userData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).to.have.property('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const userData = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Verify email (in real test, you'd need to get the token)
      // For now, manually verify in database

      const loginData = {
        email: 'jane@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).to.have.property('accessToken');
      expect(response.body).to.have.property('user');
    });
  });
});