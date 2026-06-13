const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

// List user's addresses
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Addresses GET error:', error)
    res.status(500).json({ message: 'Server error!' })
  }
})

// Add new address
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, line1, line2, city, state, pincode, is_default } = req.body

    if (!name || !phone || !line1 || !city || !state || !pincode) {
      return res.status(400).json({ message: 'Missing required address fields!' })
    }

    // If setting as default, clear existing defaults first
    if (is_default) {
      await pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.id]
      )
    }

    const result = await pool.query(
      `INSERT INTO addresses (user_id, name, phone, line1, line2, city, state, pincode, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, name, phone, line1, line2 || null, city, state, pincode, is_default || false]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Addresses POST error:', error)
    res.status(500).json({ message: 'Server error!' })
  }
})

// Update address
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, line1, line2, city, state, pincode, is_default } = req.body

    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found!' })
    }

    if (is_default) {
      await pool.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.id]
      )
    }

    const result = await pool.query(
      `UPDATE addresses
       SET name = $1, phone = $2, line1 = $3, line2 = $4,
           city = $5, state = $6, pincode = $7, is_default = $8
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [name, phone, line1, line2 || null, city, state, pincode, is_default || false, req.params.id, req.user.id]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Addresses PUT error:', error)
    res.status(500).json({ message: 'Server error!' })
  }
})

// Delete address
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found!' })
    }

    res.json({ message: 'Address deleted!' })
  } catch (error) {
    console.error('Addresses DELETE error:', error)
    res.status(500).json({ message: 'Server error!' })
  }
})

// Set default address
router.put('/:id/default', auth, async (req, res) => {
  try {
    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Address not found!' })
    }

    // Clear all defaults then set this one
    await pool.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1',
      [req.user.id]
    )
    const result = await pool.query(
      'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    )

    res.json({ message: 'Default address updated!', address: result.rows[0] })
  } catch (error) {
    console.error('Addresses default error:', error)
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
