const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

// Get cart
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.quantity, c.product_id,
              p.name, p.price, p.image, p.stock
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1`,
      [req.user.id]
    )

    const total = result.rows.reduce(
      (sum, item) => sum + (item.price * item.quantity), 0
    )

    res.json({ items: result.rows, total })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Add to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body

    // Check product exists
    const product = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
      [product_id]
    )
    if (product.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found!' })
    }

    // Check stock
    if (product.rows[0].stock < quantity) {
      return res.status(400).json({ message: 'Not enough stock!' })
    }

    // Add or update cart
    await pool.query(
      `INSERT INTO cart (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart.quantity + $3`,
      [req.user.id, product_id, quantity]
    )

    res.json({ message: 'Added to cart!' })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Update quantity
router.put('/:id', auth, async (req, res) => {
  try {
    const { quantity } = req.body

    if (quantity <= 0) {
      await pool.query(
        'DELETE FROM cart WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      )
      return res.json({ message: 'Item removed!' })
    }

    await pool.query(
      'UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3',
      [quantity, req.params.id, req.user.id]
    )

    res.json({ message: 'Cart updated!' })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Remove from cart
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM cart WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    res.json({ message: 'Removed from cart!' })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Clear cart
router.delete('/', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id])
    res.json({ message: 'Cart cleared!' })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
