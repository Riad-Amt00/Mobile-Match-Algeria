import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' })
const db = new PrismaClient({ adapter })
const NEEDLE = 'recoverymymail123321'

const user = await db.user.findFirst({
  where: { email: { contains: NEEDLE } },
  include: {
    accounts: true,
    sessions: true,
    profile: true,
    savedOffers: true,
    notifications: true,
  },
})

if (!user) {
  console.log(`No user found with email containing "${NEEDLE}"`)
  await db.$disconnect()
  process.exit(0)
}

console.log(`Found user: ${user.email}  (id: ${user.id})`)
console.log(`  - accounts:       ${user.accounts.length}`)
console.log(`  - sessions:       ${user.sessions.length}`)
console.log(`  - profile:        ${user.profile ? 1 : 0}`)
console.log(`  - savedOffers:    ${user.savedOffers.length}`)
console.log(`  - notifications:  ${user.notifications.length}`)

const tokens = await db.verificationToken.findMany({
  where: { identifier: user.email },
})
console.log(`  - verificationTokens (by email): ${tokens.length}`)

const vtDel = await db.verificationToken.deleteMany({
  where: { identifier: user.email },
})
console.log(`\nDeleted ${vtDel.count} VerificationToken rows`)

await db.user.delete({ where: { id: user.id } })
console.log(`Deleted user ${user.email}  (cascade: accounts, sessions, profile, savedOffers, notifications)`)

const remainingUsers = await db.user.count()
const remainingProfiles = await db.userProfile.count()
const remainingSaved = await db.savedOffer.count()
const remainingNotifs = await db.notification.count()
const remainingTokens = await db.verificationToken.count()
console.log(`\nFinal counts:`)
console.log(`  User:              ${remainingUsers}`)
console.log(`  UserProfile:       ${remainingProfiles}`)
console.log(`  SavedOffer:        ${remainingSaved}`)
console.log(`  Notification:      ${remainingNotifs}`)
console.log(`  VerificationToken: ${remainingTokens}`)

await db.$disconnect()
