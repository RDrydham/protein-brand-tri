const express = require('express')
const router = express.Router()
const pool = require('../db')
const cache = require('../utils/cache')

const PRODUCTS_CACHE_KEY = 'products:all'
const PRODUCT_TTL = 60 // seconds

// Get all products (cached 60s)
router.get('/', async (req, res) => {
  try {
    const cached = await cache.get(PRODUCTS_CACHE_KEY)
    if (cached) {
      return res.json(cached)
    }

    const result = await pool.query(
      'SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC'
    )

    await cache.set(PRODUCTS_CACHE_KEY, result.rows, PRODUCT_TTL)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

// Get single product by slug
router.get('/:slug', async (req, res) => {
  try {
    const cacheKey = `product:${req.params.slug}`
    const cached = await cache.get(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    const result = await pool.query(
      'SELECT * FROM products WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found!' })
    }

    await cache.set(cacheKey, result.rows[0], PRODUCT_TTL)
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
