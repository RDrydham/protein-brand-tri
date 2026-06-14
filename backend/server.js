require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const app = express()
const PORT = process.env.PORT || 3000

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
app.use('/api/admin', require('./routes/admin'))

// ── Health Check ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// ── 404 Handler ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found!' })
})

// ── Error Handler ────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

// ── Start Server ─────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 TRI Backend running on port ${PORT}`)
})

module.exports = app
