const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')
const { sendOrderConfirmation } = require('../utils/email')

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TRI-${timestamp}-${random}`
}

// Place order
router.post('/place', auth, async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { address, address_id, notes } = req.body

    // Get cart items
    const cartResult = await client.query(
      `SELECT c.*, p.name, p.price, p.stock
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1`,
      [req.user.id]
    )

    // ── FIX: ROLLBACK before early return ──────────────────────────────
    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Cart is empty!' })
    }

    // Resolve delivery address
    let resolvedAddress
    if (address_id) {
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
    const total = cartResult.rows.reduce(
      (sum, item) => sum + (item.price * item.quantity), 0
    )

    // Check stock for all items
    for (const item of cartResult.rows) {
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
      [orderNumber, req.user.id, total, JSON.stringify(resolvedAddress), notes]
    )

    const order = orderResult.rows[0]

    // Create order items & update stock
    for (const item of cartResult.rows) {
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
    await client.query('DELETE FROM cart WHERE user_id = $1', [req.user.id])

    await client.query('COMMIT')

    // Send confirmation email (non-blocking)
    try {
      const userResult = await pool.query(
        'SELECT email FROM users WHERE id = $1', [req.user.id]
      )
      await sendOrderConfirmation(
        userResult.rows[0].email,
        order,
        cartResult.rows
      )
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
