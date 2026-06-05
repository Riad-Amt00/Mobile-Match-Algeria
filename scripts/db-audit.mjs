import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' })
const db = new PrismaClient({ adapter })

console.log('=== TABLE COUNTS ===')
const counts = {
  User: await db.user.count(),
  Account: await db.account.count(),
  Session: await db.session.count(),
  VerificationToken: await db.verificationToken.count(),
  UserProfile: await db.userProfile.count(),
  Operator: await db.operator.count(),
  Offer: await db.offer.count(),
  PriceHistory: await db.priceHistory.count(),
  SavedOffer: await db.savedOffer.count(),
  Notification: await db.notification.count(),
  ScrapeLog: await db.scrapeLog.count(),
  RateLimit: await db.rateLimit.count(),
}
for (const [t, c] of Object.entries(counts)) console.log(`  ${t.padEnd(20)} ${c}`)

console.log('\n=== INTEGRITY CHECKS ===')

const allOffers = await db.offer.findMany({ select: { id: true, operatorId: true } })
const allOperators = await db.operator.findMany({ select: { id: true } })
const opIds = new Set(allOperators.map(o => o.id))
const orphanOffers = allOffers.filter(o => !opIds.has(o.operatorId))
console.log(`  Orphan offers (no operator):           ${orphanOffers.length}`)

const allSaved = await db.savedOffer.findMany({ select: { offerId: true, userId: true } })
const allUsers = await db.user.findMany({ select: { id: true } })
const userIds = new Set(allUsers.map(u => u.id))
const offerIds = new Set(allOffers.map(o => o.id))
const orphanSavedByUser = allSaved.filter(s => !userIds.has(s.userId))
const orphanSavedByOffer = allSaved.filter(s => !offerIds.has(s.offerId))
console.log(`  Orphan SavedOffer (bad userId):        ${orphanSavedByUser.length}`)
console.log(`  Orphan SavedOffer (bad offerId):       ${orphanSavedByOffer.length}`)

const allNotifs = await db.notification.findMany({ select: { userId: true } })
const orphanNotifs = allNotifs.filter(n => !userIds.has(n.userId))
console.log(`  Orphan Notification (bad userId):      ${orphanNotifs.length}`)

const allProfiles = await db.userProfile.findMany({ select: { userId: true } })
const orphanProfiles = allProfiles.filter(p => !userIds.has(p.userId))
console.log(`  Orphan UserProfile (bad userId):       ${orphanProfiles.length}`)

const allHistory = await db.priceHistory.findMany({ select: { offerId: true } })
const orphanHistory = allHistory.filter(h => !offerIds.has(h.offerId))
console.log(`  Orphan PriceHistory (bad offerId):     ${orphanHistory.length}`)

const allLogs = await db.scrapeLog.findMany({ select: { operatorId: true } })
const orphanLogs = allLogs.filter(l => !opIds.has(l.operatorId))
console.log(`  Orphan ScrapeLog (bad operatorId):     ${orphanLogs.length}`)

const expired = await db.rateLimit.count({ where: { resetAt: { lt: new Date() } } })
console.log(`  Expired RateLimit rows (cleanable):    ${expired}`)

const oldReadNotifs = await db.notification.count({
  where: { isRead: true, createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
})
console.log(`  Old read Notifications (>30 days):     ${oldReadNotifs}`)

console.log('\n=== OFFERS BY OPERATOR ===')
const opGroups = await db.offer.groupBy({
  by: ['operatorId'],
  _count: { _all: true },
})
for (const g of opGroups) {
  const op = await db.operator.findUnique({ where: { id: g.operatorId }, select: { name: true } })
  console.log(`  ${(op?.name ?? '???').padEnd(15)} ${g._count._all}`)
}

console.log('\n=== USERS ===')
const users = await db.user.findMany({ select: { email: true, role: true, emailVerified: true, createdAt: true } })
for (const u of users) {
  console.log(`  ${u.email.padEnd(35)} ${u.role.padEnd(8)} verified=${u.emailVerified ? 'yes' : 'no'}`)
}

console.log('\n=== SCRAPE LOG SUMMARY ===')
const okLogs = await db.scrapeLog.count({ where: { status: 'SUCCESS' } })
const failLogs = await db.scrapeLog.count({ where: { status: 'FAILED' } })
const partialLogs = await db.scrapeLog.count({ where: { status: 'PARTIAL' } })
console.log(`  SUCCESS: ${okLogs}    PARTIAL: ${partialLogs}    FAILED: ${failLogs}`)
const lastScrape = await db.scrapeLog.findFirst({ orderBy: { startedAt: 'desc' } })
console.log(`  Last scrape: ${lastScrape?.startedAt?.toISOString() ?? 'never'}`)

const dbSize = (await import('fs')).statSync('./prisma/dev.db').size
console.log(`\n=== DB FILE SIZE: ${(dbSize / 1024).toFixed(1)} KB ===`)

await db.$disconnect()
