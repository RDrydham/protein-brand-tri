require('dotenv').config()

// ── Startup Guard — Warn if critical env vars are missing ──
const REQUIRED_ENV = ['JWT_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_ENV.filter(k => !process.env[k])
  if (missing.length > 0) {
    console.warn('⚠️ WARNING: Missing required env vars:', missing.join(', '))
    console.warn('Backend will run in degraded mode. Razorpay or Auth may fail.')
  }
}
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const app = express()
const PORT = process.env.PORT || 3000
app.set('trust proxy',1)

// ── Security Middleware ──────────────────────
app.use(helmet())

app.use(cors({
  origin: [
    'https://therealinside.com',
    'https://www.therealinside.com',
    'https://therealaside.com',
    'https://www.therealaside.com',
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, try again later!'
})

app.use('/api/', limiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Routes ───────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/products', require('./routes/products'))
app.use('/api/cart', require('./routes/cart'))
app.use('/api/orders', require('./routes/orders'))
app.use('/api/addresses', require('./routes/addresses'))
app.use('/api/payment', require('./routes/payment'))
app.use('/api/newsletter', require('./routes/newsletter'))
app.use('/api/coupons', require('./routes/coupons'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/reviews', require('./routes/reviews'))

// ── Health Check ─────────────────────────────
const healthCheck = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
}
app.get('/health', healthCheck)
app.get('/api/health', healthCheck)

// ── 404 Handler ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found!' })
})

// ── Error Handler ────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err)
  res.status(500).json({ success: false, message: err.message || 'Something went wrong!' })
})

// ── Process Crash Protections ────────────────
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason)
})

// ── Start Server ─────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 TRI Backend running on port ${PORT}`)
  })
}

module.exports = app
