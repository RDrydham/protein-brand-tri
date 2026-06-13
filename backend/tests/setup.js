/**
 * Test setup helpers — shared DB pool and app for integration tests.
 * Tests use process.env.DATABASE_URL or fall back to the .env config.
 * Redis cache is automatically a no-op when REDIS_URL is not set.
 */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-ci'

// Suppress Redis connection noise in test output
process.env.REDIS_URL = process.env.REDIS_URL || ''
