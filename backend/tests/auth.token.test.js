import request from 'supertest'
import app from '../server.js'
import db from '../models/db.js'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'
const { sign } = jwt;

describe('Auth Token Endpoints', () => {
  let refreshToken

  const user = {
    id: 1,
    email: 'test@example.com'
  }

  beforeAll(async () => {
    const hashed = await bcrypt.hash('test123', 10)
    const result = await db.query(`
      INSERT INTO users (email, password, plan_id)
      VALUES (?, ?, ?)
    `, ['test@example.com', hashed, 1])
    user.id = result.insertId

    refreshToken = sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
    await db.query('INSERT INTO refresh_tokens SET ?', {
      user_id: user.id,
      token: refreshToken,
      user_agent: 'TestAgent',
      ip_address: '127.0.0.1',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })
  })

  afterAll(async () => {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id])
    await db.query('DELETE FROM users WHERE id = ?', [user.id])
  })

  it('should issue new access token with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ token: refreshToken })

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('should revoke refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/revoke')
      .send({ token: refreshToken })

    expect(res.statusCode).toBe(200)
    expect(res.body.revoked).toBe(true)
  })
})