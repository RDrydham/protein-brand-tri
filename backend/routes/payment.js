const express = require('express')
const router = express.Router()
const Razorpay = require('razorpay')
const crypto = require('crypto')
const pool = require('../db')
const auth = require('../middleware/auth')

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

// Create Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { order_id } = req.body

    // Get order from DB
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [order_id, req.user.id]
    )

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found!' })
    }

    const order = orderResult.rows[0]
    const amount = Math.round(order.total * 100) // Paise mein

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: order.order_number,
      notes: {
        order_id: order.id,
        user_id: req.user.id
      }
    })

    // Save razorpay order id
    await pool.query(
      'UPDATE orders SET razorpay_order_id = $1 WHERE id = $2',
      [razorpayOrder.id, order.id]
    )

    res.json({
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    })
  } catch (error) {
    console.error('Payment error:', error)
    res.status(500).json({ message: 'Payment error!' })
  }
})

// Verify payment
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature!' })
    }

    // Update order status
    await pool.query(
      `UPDATE orders SET 
       payment_status = 'paid',
       payment_id = $1,
       status = 'confirmed'
       WHERE razorpay_order_id = $2`,
      [razorpay_payment_id, razorpay_order_id]
    )

    res.json({ message: 'Payment verified successfully!' })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
