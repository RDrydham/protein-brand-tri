const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')
const isAdmin = require('../middleware/admin')

// Dashboard stats
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const [orders, users, products, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']),
      pool.query('SELECT COUNT(*) FROM products WHERE is_active = true'),
      pool.query(`SELECT COALESCE(SUM(total), 0) as total 
                  FROM orders WHERE payment_status = 'paid'`)
    ])

    res.json({
      total_orders: orders.rows[0].count,
      total_users: users.rows[0].count,
      total_products: products.rows[0].count,
      total_revenue: revenue.rows[0].total
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Get all orders
router.get('/orders', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Update order status
router.put('/orders/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status!' })
    }

    await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [status, req.params.id]
    )

    res.json({ message: 'Order status updated!' })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Get all products
router.get('/products', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Add product
router.post('/products', auth, isAdmin, async (req, res) => {
  try {
    const { name, slug, description, price, original_price, stock, image, category } = req.body

    const result = await pool.query(
      `INSERT INTO products (name, slug, description, price, original_price, stock, image, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, slug, description, price, original_price, stock, image, category]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Update product
router.put('/products/:id', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, price, original_price, stock, is_active } = req.body

    const result = await pool.query(
      `UPDATE products SET 
       name = $1, description = $2, price = $3,
       original_price = $4, stock = $5, is_active = $6
       WHERE id = $7 RETURNING *`,
      [name, description, price, original_price, stock, is_active, req.params.id]
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Newsletter subscribers
router.get('/newsletter', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM newsletter ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
