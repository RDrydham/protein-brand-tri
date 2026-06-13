const request = require('supertest')
const app = require('../server')
const pool = require('../db')

// Clean up test users after each suite
afterAll(async () => {
  try {
    await pool.query("DELETE FROM users WHERE email LIKE '%@test.tri'")
  } catch (_) {}
  await pool.end()
})

describe('Auth — Register', () => {
  const testEmail = `reg_${Date.now()}@test.tri`

  it('registers a new user successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: testEmail,
      password: 'password123'
    })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).toMatchObject({ email: testEmail })
  })

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: testEmail,
      password: 'password123'
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/already registered/i)
  })

  it('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'No Pass',
      email: `nopass_${Date.now()}@test.tri`
    })
    expect(res.status).toBe(400)
  })

  it('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'password123'
    })
    expect(res.status).toBe(400)
  })
})

describe('Auth — Login', () => {
  const loginEmail = `login_${Date.now()}@test.tri`

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email: loginEmail,
      password: 'mypassword'
    })
  })

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: loginEmail,
      password: 'mypassword'
    })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.email).toBe(loginEmail)
  })

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: loginEmail,
      password: 'wrongpassword'
    })
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/invalid/i)
  })

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.tri',
      password: 'anything'
    })
    expect(res.status).toBe(401)
  })
})

describe('Auth — Profile', () => {
  let token

  beforeAll(async () => {
    const email = `profile_${Date.now()}@test.tri`
    const res = await request(app).post('/api/auth/register').send({
      name: 'Profile User',
      email,
      password: 'pass1234'
    })
    token = res.body.token
  })

  it('returns profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('email')
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/profile')
    expect(res.status).toBe(401)
  })

  it('returns 401 with garbage token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer notarealtoken')
    expect(res.status).toBe(401)
  })
})
