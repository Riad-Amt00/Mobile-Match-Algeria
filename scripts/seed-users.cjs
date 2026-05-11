'use strict'
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const db = new Database('./prisma/dev.db')

function cuid() {
  return 'c' + crypto.randomBytes(11).toString('base64url').toLowerCase().slice(0, 23)
}

const now = new Date().toISOString()

const users = [
  { email: 'demo@mobilematch.dz',  name: 'Demo User',  password: 'demo123456',  role: 'USER'  },
  { email: 'admin@mobilematch.dz', name: 'Admin',       password: 'admin123456', role: 'ADMIN' },
]

const insert = db.prepare(`
  INSERT OR IGNORE INTO User (id, name, email, passwordHash, role, emailVerified, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 12)
  const id = cuid()
  const result = insert.run(id, u.name, u.email, hash, u.role, now, now, now)
  if (result.changes > 0) {
    console.log(`✓ Created ${u.role}: ${u.email}  /  password: ${u.password}`)
  } else {
    console.log(`— Already exists: ${u.email}`)
  }
}

console.log('\nDone.')
