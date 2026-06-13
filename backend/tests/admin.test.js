const request = require('supertest')
const app = require('../server')
const pool = require('../db')

let adminToken
let userToken
let userId

beforeAll(async () => {
  // Create regular user
  const email = `admin_test_${Date.now()}@test.tri`
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Regular User',
    email,
    password: 'testpass'
  })
  userToken = regRes.body.token
  userId = regRes.body.user.id

  // Get admin token by logging in as the seed admin
  // (Requires seed admin user in DB with correct bcrypt hash)
  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'admin@therealinside.com',
    password: 'admin123'
  })
  adminToken = loginRes.body.token
})

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE id = $1', [userId])
  await pool.end()
})

// ── Role guard tests ─────────────────────────────────────────────────────────

const ADMIN_ROUTES = [
  { method: 'get',  path: '/api/admin/stats' },
  { method: 'get',  path: '/api/admin/orders' },
  { method: 'get',  path: '/api/admin/users' },
  { method: 'get',  path: '/api/admin/products' },
  { method: 'get',  path: '/api/admin/newsletter' }
]

describe('Admin — Role Guard (non-admin gets 403)', () => {
  ADMIN_ROUTES.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} returns 403 for regular user`, async () => {
      const res = await request(app)
        [method](path)
        .set('Authorization', `Bearer ${userToken}`)
      expect(res.status).toBe(403)
      expect(res.body.message).toMatch(/admin/i)
    })

    it(`${method.toUpperCase()} ${path} returns 401 with no token`, async () => {
      const res = await request(app)[method](path)
      expect(res.status).toBe(401)
    })
  })
})

// ── Admin-accessible routes ───────────────────────────────────────────────────

describe('Admin — Accessible for admin user', () => {
  it('GET /api/admin/stats returns stats object', async () => {
    if (!adminToken) return // Skip if seed admin not in test DB
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total_orders')
    expect(res.body).toHaveProperty('total_users')
    expect(res.body).toHaveProperty('total_revenue')
  })

  it('GET /api/admin/orders returns array', async () => {
    if (!adminToken) return
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /api/admin/users returns array', async () => {
    if (!adminToken) return
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
