const express = require('express')
const router = express.Router()
const pool = require('../db')

/**
 * POST /api/coupons/validate
 * Validates a coupon code and returns the discount details.
 * Body: { code: string, totalAmount: number }
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, totalAmount } = req.body

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' })
    }

    // Look up coupon in DB (if the table exists)
    let coupon = null
    try {
      const result = await pool.query(
        `SELECT * FROM coupons 
         WHERE UPPER(code) = UPPER($1) 
           AND is_active = true 
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR uses_count < max_uses)`,
        [code.trim()]
      )
      if (result.rows.length > 0) {
        coupon = result.rows[0]
      }
    } catch (dbErr) {
      // coupons table may not exist yet — treat as invalid coupon
      console.warn('[Coupons] Table may not exist:', dbErr.message)
    }

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code.' })
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round((parseFloat(totalAmount || 0) * coupon.discount_value) / 100)
    } else if (coupon.discount_type === 'flat') {
      discountAmount = coupon.discount_value
    }

    discountAmount = Math.min(discountAmount, parseFloat(totalAmount || 0))

    return res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        value: coupon.discount_value,
        discountAmount
      }
    })
  } catch (err) {
    console.error('[Coupons] Error:', err)
    res.status(500).json({ success: false, message: 'Server error validating coupon.' })
  }
})

module.exports = router
