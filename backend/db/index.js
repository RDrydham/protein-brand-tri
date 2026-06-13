const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tridb',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

pool.on('connect', () => {
  console.log('✅ Database connected!')
})

pool.on('error', (err) => {
  console.error('❌ Database error:', err)
})

module.exports = pool
