const express = require('express')
const router = express.Router()
const pool = require('../db')
const { sendNewsletterConfirmation } = require('../utils/email')

// Subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email required!' })
    }

    await pool.query(
      'INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    )

    try {
      await sendNewsletterConfirmation(email)
    } catch (emailError) {
      console.error('Email error:', emailError)
    }

    res.json({ message: 'Subscribed successfully!' })
  } catch (error) {
    res.status(500).json({ message: 'Server error!' })
  }
})

module.exports = router
