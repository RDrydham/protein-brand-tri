/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
  // Don't transform node_modules
  transformIgnorePatterns: ['/node_modules/'],
  // Collect coverage info
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!utils/email.js' // email requires live SMTP, excluded from coverage
  ]
}
