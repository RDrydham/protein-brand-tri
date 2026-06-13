const express = require('express')
const router = express.Router()
const pool = require('../db')

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    let query = 'SELECT * FROM products WHERE is_active = true'
    const params = []

    if (category) {
      query += ' AND category = $1'
      params.push(category)
    }

    query += ' ORDER BY created_at DESC'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Get single product
router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found!' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
