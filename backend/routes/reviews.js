const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

// ── GET /api/reviews/:productName ─────────────────────────────────
// Public — fetch all reviews + computed stats for a product
router.get('/:productName', async (req, res) => {
  try {
    const { productName } = req.params

    const result = await pool.query(
      `SELECT
         r.id,
         r.rating,
         r.comment,
         r.created_at AS "createdAt",
         u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_name = $1
       ORDER BY r.created_at DESC`,
      [productName.trim()]
    )

    const reviews = result.rows.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      user: { name: r.user_name }
    }))

    const count = reviews.length
    const averageRating = count > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
      : 0

    return res.json({
      success: true,
      productName,
      averageRating,
      reviewCount: count,
      reviews
    })
  } catch (error) {
    console.error('[Get Reviews Error]:', error.message)
    return res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' })
  }
})

// ── POST /api/reviews/add ─────────────────────────────────────────
// Protected — submit or update a review (one per user per product)
router.post('/add', auth, async (req, res) => {
  try {
    const { productName, rating, comment } = req.body
    const userId = req.user.id

    if (!productName || rating === undefined || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product name, rating, and comment are required.'
      })
    }

    const ratingVal = parseInt(rating)
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' })
    }

    // Upsert: update if this user already reviewed this product, else insert
    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_name, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_name)
       DO UPDATE SET rating = EXCLUDED.rating,
                     comment = EXCLUDED.comment,
                     updated_at = NOW()
       RETURNING *`,
      [userId, productName.trim(), ratingVal, comment.trim()]
    )

    return res.json({
      success: true,
      message: 'Review saved successfully.',
      review: result.rows[0]
    })
  } catch (error) {
    console.error('[Add Review Error]:', error.message)
    return res.status(500).json({ success: false, message: 'Failed to save review.' })
  }
})

module.exports = router
