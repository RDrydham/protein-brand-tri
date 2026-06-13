const request = require('supertest')
const app = require('../server')
const pool = require('../db')

let token
let userId
let productId

beforeAll(async () => {
  // Create test user
  const email = `cart_${Date.now()}@test.tri`
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Cart Tester',
    email,
    password: 'testpass'
  })
  token = regRes.body.token
  userId = regRes.body.user.id

  // Get first active product id
  const prodRes = await pool.query(
    'SELECT id, stock FROM products WHERE is_active = true AND stock > 0 LIMIT 1'
  )
  productId = prodRes.rows[0]?.id
})

afterAll(async () => {
  await pool.query("DELETE FROM cart WHERE user_id = $1", [userId])
  await pool.query("DELETE FROM users WHERE id = $1", [userId])
  await pool.end()
})

describe('Cart — Read & Write', () => {
  it('returns empty cart initially', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
    expect(res.body.total).toBe(0)
  })

  it('adds a product to cart', async () => {
    if (!productId) return // skip if no products
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 1 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/added/i)
  })

  it('rejects adding out-of-stock amount', async () => {
    if (!productId) return
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 999999 })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/stock/i)
  })

  it('rejects adding non-existent product', async () => {
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 999999, quantity: 1 })
    expect(res.status).toBe(404)
  })

  it('lists cart items', async () => {
    if (!productId) return
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('updates quantity', async () => {
    if (!productId) return
    // Get item id first
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`)
    const item = cartRes.body.items[0]
    if (!item) return

    const res = await request(app)
      .put(`/api/cart/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 })
    expect(res.status).toBe(200)
  })

  it('removes item when quantity set to 0', async () => {
    if (!productId) return
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`)
    const item = cartRes.body.items[0]
    if (!item) return

    const res = await request(app)
      .put(`/api/cart/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 0 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/removed/i)
  })

  it('clears the cart', async () => {
    // Re-add something first
    if (productId) {
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, quantity: 1 })
    }

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/cleared/i)
  })

  it('returns 401 for unauthenticated cart access', async () => {
    const res = await request(app).get('/api/cart')
    expect(res.status).toBe(401)
  })
})
