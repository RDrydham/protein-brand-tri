const redis = require('redis')

let client = null
let isReady = false

// Connect to Redis — gracefully degrades if Redis is unavailable
const connect = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379'
    })

    client.on('error', (err) => {
      console.warn('⚠️  Redis client error (cache disabled):', err.message)
      isReady = false
    })

    client.on('ready', () => {
      console.log('✅ Redis connected!')
      isReady = true
    })

    client.on('end', () => {
      isReady = false
    })

    await client.connect()
  } catch (err) {
    console.warn('⚠️  Redis unavailable — running without cache:', err.message)
    isReady = false
  }
}

// Get cached value (returns null on miss or Redis unavailable)
const get = async (key) => {
  if (!isReady) return null
  try {
    const val = await client.get(key)
    return val ? JSON.parse(val) : null
  } catch (err) {
    console.warn('Cache GET error:', err.message)
    return null
  }
}

// Set a value with optional TTL in seconds (default 60s)
const set = async (key, value, ttl = 60) => {
  if (!isReady) return
  try {
    await client.set(key, JSON.stringify(value), { EX: ttl })
  } catch (err) {
    console.warn('Cache SET error:', err.message)
  }
}

// Delete a key
const del = async (key) => {
  if (!isReady) return
  try {
    await client.del(key)
  } catch (err) {
    console.warn('Cache DEL error:', err.message)
  }
}

// Delete all keys matching a pattern (uses SCAN to avoid blocking)
const delPattern = async (pattern) => {
  if (!isReady) return
  try {
    let cursor = 0
    do {
      const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 })
      cursor = reply.cursor
      if (reply.keys.length > 0) {
        await client.del(reply.keys)
      }
    } while (cursor !== 0)
  } catch (err) {
    console.warn('Cache DEL pattern error:', err.message)
  }
}

// Initialize on module load
connect()

module.exports = { get, set, del, delPattern }
