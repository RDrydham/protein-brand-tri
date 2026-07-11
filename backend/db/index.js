const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tridb',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})

pool.on('connect', () => {
  console.log('✅ Database connected!')
})

pool.on('error', (err) => {
  console.error('❌ Database error:', err)
})

// Auto-migrate: create any missing tables on startup.
// Uses IF NOT EXISTS so it is safe to run on every restart.
async function init () {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment      TEXT NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, product_name)
      )
    `)
    console.log('✅ reviews table ready')
  } catch (err) {
    console.error('❌ DB init error:', err.message)
  }
}

module.exports = pool
module.exports.init = init
