#!/usr/bin/env node
/**
 * scripts/seed-admin.js
 *
 * Generates a fresh bcrypt hash for the admin password and prints
 * the SQL UPDATE statement to run against production.
 *
 * Usage:
 *   node scripts/seed-admin.js <new-password>
 *
 * Example:
 *   node scripts/seed-admin.js MyStr0ngP@ssword!
 */

const bcrypt = require('bcrypt')

const ADMIN_EMAIL = 'admin@therealinside.com'
const COST_FACTOR = 10

async function main () {
  const newPassword = process.argv[2]

  if (!newPassword) {
    console.error('❌  Usage: node scripts/seed-admin.js <new-password>')
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error('❌  Password must be at least 8 characters.')
    process.exit(1)
  }

  console.log(`\n🔒 Generating bcrypt hash (cost=${COST_FACTOR})...`)
  const hash = await bcrypt.hash(newPassword, COST_FACTOR)

  console.log('\n✅ Hash generated successfully!\n')
  console.log('Run the following SQL on your production database:\n')
  console.log('─'.repeat(60))
  console.log(`UPDATE users`)
  console.log(`  SET password = '${hash}'`)
  console.log(`  WHERE email = '${ADMIN_EMAIL}';`)
  console.log('─'.repeat(60))
  console.log('\n⚠️  Keep this hash private. Do not commit it to git.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
