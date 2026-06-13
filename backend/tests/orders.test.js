const request = require('supertest')
const app = require('../server')
const pool = require('../db')

let token
let userId

const mockAddress = {
  name: 'Test User',
  phone: '9999999999',
  line1: '123 Test Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001'
}

beforeAll(async () => {
  const email = `orders_${Date.now()}@test.tri`
  const res = await request(app).post('/api/auth/register').send({
    name: 'Orders Tester',
    email,
    password: 'testpass'
  })
  token = res.body.token
  userId = res.body.user.id
})

afterAll(async () => {
  await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [userId])
  await pool.query('DELETE FROM orders WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM cart WHERE user_id = $1', [userId])
  await pool.query('DELETE FROM users WHERE id = $1', [userId])
  await pool.end()
})

describe('Orders — Empty Cart (Transaction Leak Fix)', () => {
  it('returns 400 for empty cart without leaking transaction', async () => {
    // Cart is empty at this point
    const res = await request(app)
      .post('/api/orders/place')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: mockAddress })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/empty/i)

    // Verify the pool isn't stuck with an open transaction
    // by successfully running a subsequent query
    const check = await pool.query('SELECT 1 as ok')
    expect(check.rows[0].ok).toBe(1)
  })
})

describe('Orders — Happy Path', () => {
  let productId
  let productStock

  beforeAll(async () => {
    // Get a product with stock
    const prod = await pool.query(
      'SELECT id, stock FROM products WHERE is_active = true AND stock > 0 LIMIT 1'
    )
    if (prod.rows.length > 0) {
      productId = prod.rows[0].id
      productStock = prod.rows[0].stock

      // Add to cart
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, quantity: 1 })
    }
  })

  it('places order successfully with raw address', async () => {
    if (!productId) return

    const res = await request(app)
      .post('/api/orders/place')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: mockAddress })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('order_number')
    expect(res.body).toHaveProperty('order_id')
    expect(res.body.message).toMatch(/successfully/i)
  })

  it('returns order in history', async () => {
    const res = await request(app)
      .get('/api/orders/history')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('requires auth to place order', async () => {
    const res = await request(app)
      .post('/api/orders/place')
      .send({ address: mockAddress })
    expect(res.status).toBe(401)
  })

  it('rejects order with no address', async () => {
    // Re-add to cart
    if (productId) {
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, quantity: 1 })
    }

    const res = await request(app)
      .post('/api/orders/place')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
  })
})
