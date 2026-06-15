const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')
const { sendOrderConfirmation } = require('../utils/email')

// Middleware to optionally authenticate a request if a JWT is present
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return next()
    }
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    next()
  }
}

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TRI-${timestamp}-${random}`
}

// Place order
router.post('/place', optionalAuth, async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { address, address_id, notes } = req.body

    let cartItems = []

    // A. Authenticated User Checkout
    if (req.user) {
      // Get cart items
      const cartResult = await client.query(
        `SELECT c.*, p.name, p.price, p.stock
         FROM cart c
         JOIN products p ON c.product_id = p.id
         WHERE c.user_id = $1`,
        [req.user.id]
      )

      if (cartResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ message: 'Cart is empty!' })
      }

      cartItems = cartResult.rows.map(r => ({
        product_id: r.product_id,
        name: r.name,
        price: parseFloat(r.price) || 0,
        stock: r.stock,
        quantity: r.quantity
      }))
    }
    // B. Guest User Checkout
    else {
      const rawItems = req.body.items
      if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ message: 'Cart is empty!' })
      }

      for (const item of rawItems) {
        const name = item.name || item.productName
        const qty = parseInt(item.qty || item.quantity) || 1
        if (!name) continue

        // Resolve product_id, price, and stock from DB
        const productResult = await client.query(
          `SELECT id, name, price, stock FROM products 
           WHERE name = $1 
              OR $1 ILIKE '%' || name || '%'
              OR name ILIKE '%' || $1 || '%'`,
          [name.trim()]
        )

        if (productResult.rows.length === 0) {
          await client.query('ROLLBACK')
          return res.status(404).json({ message: `Product not found: ${name}` })
        }

        const prod = productResult.rows[0]
        cartItems.push({
          product_id: prod.id,
          name: prod.name,
          price: parseFloat(prod.price) || 0,
          stock: prod.stock,
          quantity: qty
        })
      }
    }

    // Resolve delivery address
    let resolvedAddress
    if (req.user && address_id) {
      // Pull address from addresses table (backward-compatible)
      const addrResult = await client.query(
        'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
        [address_id, req.user.id]
      )
      if (addrResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ message: 'Address not found!' })
      }
      const a = addrResult.rows[0]
      resolvedAddress = {
        name: a.name,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        pincode: a.pincode
      }
    } else if (address) {
      resolvedAddress = address
    } else {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Delivery address is required!' })
    }

    // Calculate total
    const total = cartItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 0
    )

    // Check stock for all items
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: `Not enough stock for ${item.name}!`
        })
      }
    }

    // Create order
    const orderNumber = generateOrderNumber()
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, total, address, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [orderNumber, req.user ? req.user.id : null, total, JSON.stringify(resolvedAddress), notes]
    )

    const order = orderResult.rows[0]

    // Create order items & update stock
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      )

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      )
    }

    // Clear cart
    if (req.user) {
      await client.query('DELETE FROM cart WHERE user_id = $1', [req.user.id])
    }

    await client.query('COMMIT')

    // Send confirmation email (non-blocking)
    try {
      let email = req.body.customerEmail
      if (req.user) {
        const userResult = await pool.query(
          'SELECT email FROM users WHERE id = $1', [req.user.id]
        )
        email = userResult.rows[0]?.email
      }
      if (email) {
        await sendOrderConfirmation(
          email,
          order,
          cartItems
        )
      }
    } catch (emailError) {
      console.error('Email error:', emailError)
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      order_number: order.order_number,
      order_id: order.id,
      total: order.total
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Order error:', error)
    res.status(500).json({ message: 'Server error!' })
  } finally {
    client.release()
  }
})

// Get order history
router.get('/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
       json_agg(json_build_object(
         'name', p.name,
         'quantity', oi.quantity,
         'price', oi.price,
         'image', p.image
       )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Get single order
router.get('/:order_number', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
       json_agg(json_build_object(
         'name', p.name,
         'quantity', oi.quantity,
         'price', oi.price,
         'image', p.image
       )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.order_number = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [req.params.order_number, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found!' })
    }

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
