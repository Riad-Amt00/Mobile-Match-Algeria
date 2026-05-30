/**
 * Scrape Orchestrator
 * Runs all three scrapers, upserts results to DB, logs everything.
 * Called daily by cron or manually via Admin panel.
 */
import { db } from '@/lib/db'
import { scrapeDjezzy } from './djezzy'
import { scrapeOoredoo } from './ooredoo'
import { scrapeMobilis } from './mobilis'
import { validateOffer } from './validate'
import { OfferType, ScrapeStatus } from '@prisma/client'
import { slugify } from '@/lib/utils'
import { recommendOffers, UserNeeds } from '../recommendation'
import { rebuildOfferFtsIndex } from '../search-fts'

// The image-only plan families (Mobilis Revolution, Djezzy iZZY) publish their
// prices inside carousel images, so they are transcribed by hand and can't be
// auto-verified. Update this date whenever that fallback data is re-checked against
// the operator pages; the orchestrator reminds admins once it ages past the threshold.
const FALLBACK_VERIFIED_AT = '2026-05-28'
const FALLBACK_STALE_DAYS = 45

export interface ScrapeResult {
  operator: string
  status: ScrapeStatus
  offersFound: number
  offersAdded: number
  offersUpdated: number
  offersDeactivated: number
  errorMessage?: string
  duration: number
}

export async function runAllScrapers(): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = []

  const jobs: Array<{
    name: string
    slug: string
    fn: (emit: (level: 'INFO' | 'OK' | 'WARN' | 'ERROR', msg: string) => void) => Promise<any[]>
  }> = [
    { name: 'Djezzy', slug: 'djezzy', fn: scrapeDjezzy },
    { name: 'Ooredoo', slug: 'ooredoo', fn: scrapeOoredoo },
    { name: 'Mobilis', slug: 'mobilis', fn: scrapeMobilis },
  ]

  for (const job of jobs) {
    const result = await runSingleScraper(job.name, job.slug, job.fn)
    results.push(result)
  }

  // Rebuild the FTS5 search index. The catalogue changes only at scrape time,
  // so a full rebuild here keeps the index consistent without any incremental
  // trigger logic. Cheap (<100 ms for ~100 rows).
  try {
    await rebuildOfferFtsIndex()
  } catch (err) {
    console.error('Failed to rebuild FTS5 index:', err)
  }

  // Generate daily personalised recommendations
  try {
    await notifyPersonalizedRecommendations()
  } catch (err) {
    console.error('Failed to generate recommendation notifications:', err)
  }

  // Notify admins of results (new offers and/or failures)
  try {
    const totalAdded = results.reduce((a, r) => a + r.offersAdded, 0)
    const failed = results.filter(r => r.status === 'FAILED')
    if (totalAdded > 0) await notifyAdmins(results, totalAdded)
    if (failed.length > 0) await notifyAdminsFailure(failed)
  } catch (err) {
    console.error('Failed to send admin notifications:', err)
  }

  // Remind admins to re-verify the hand-maintained image-only data once it's stale.
  try {
    await notifyAdminsStaleFallback()
  } catch (err) {
    console.error('Failed to send stale-data reminder:', err)
  }

  return results
}

// Proactive freshness check for the image-only fallback families. We cannot scrape
// their prices (they're pixels in carousel images), so instead of letting that data
// rot silently we alert admins to re-verify it once it ages past FALLBACK_STALE_DAYS.
// Guarded so a daily cron can't spam: at most one reminder per week.
async function notifyAdminsStaleFallback() {
  const ageDays = Math.floor((Date.now() - new Date(FALLBACK_VERIFIED_AT).getTime()) / 86_400_000)
  if (ageDays < FALLBACK_STALE_DAYS) return

  const recent = await db.notification.findFirst({
    where: { type: 'data_stale', createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
  })
  if (recent) return

  const admins = await db.user.findMany({ where: { role: 'ADMIN' } })
  if (admins.length === 0) return

  await db.notification.createMany({
    data: admins.map(admin => ({
      userId: admin.id,
      title: `Re-verify image-only offers (${ageDays} days old)`,
      message: `Mobilis Revolution and Djezzy iZZY prices are published as images and were last verified on ${FALLBACK_VERIFIED_AT}. Please re-check the operator pages and update the fallback data.`,
      type: 'data_stale',
    })),
  })
}

async function notifyAdminsFailure(failed: ScrapeResult[]) {
  const admins = await db.user.findMany({ where: { role: 'ADMIN' } })
  if (admins.length === 0) return

  const summary = failed.map(r => `${r.operator}: ${r.errorMessage || 'unknown error'}`).join(' | ')

  const notifications = admins.map(admin => ({
    userId: admin.id,
    title: `⚠ Scrape failed — ${failed.length} operator${failed.length > 1 ? 's' : ''}`,
    message: summary,
    type: 'scrape_failed',
  }))

  await db.notification.createMany({ data: notifications })
}

async function notifyAdmins(results: ScrapeResult[], totalAdded: number) {
  const admins = await db.user.findMany({ where: { role: 'ADMIN' } })
  if (admins.length === 0) return

  const summary = results
    .filter(r => r.offersAdded > 0)
    .map(r => `${r.operator}: +${r.offersAdded} new`)
    .join(', ')

  const notifications = admins.map(admin => ({
    userId: admin.id,
    title: `Scrape complete — ${totalAdded} new offer${totalAdded !== 1 ? 's' : ''} added`,
    message: summary || 'New offers were added to the database.',
    type: 'scrape_complete' as const,
  }))

  await db.notification.createMany({ data: notifications })
}

async function notifyPersonalizedRecommendations() {
  // Recommendation alerts are a user-facing feature — admins are excluded so their
  // notification feed stays purely operational (scrape complete / scrape failed).
  const usersWithProfiles = await db.user.findMany({
    where: { role: 'USER', profile: { isNot: null } },
    include: { profile: true },
  })
  if (usersWithProfiles.length === 0) return

  const allOffers = await db.offer.findMany({
    where: { isActive: true },
    include: { operator: true },
  })

  const notificationsToCreate = []

  for (const user of usersWithProfiles) {
    const p = user.profile!
    const needs: UserNeeds = {
      budget: p.monthlyBudget || 2000,
      dataGB: p.dataUsageGB || 10,
      voiceMinutes: p.voiceMinutes || 0,
      smsCount: p.smsCount || 0,
      type: (p.preferredType as any) || 'any',
      network: (p.preferredNet as any) || 'any',
      operator: (p.preferredOperator as any) || 'any',
    }

    const pris = p.priorities ? p.priorities.split(',').filter(Boolean) : []
    const matches = recommendOffers(allOffers, needs, 1, pris)
    if (matches.length > 0 && matches[0].score >= 75) {
      const best = matches[0]
      notificationsToCreate.push({
        userId: user.id,
        title: `Match found! (${best.score}%)`,
        message: `${best.offer.operator.name} ${best.offer.name} is a strong match for your profile!`,
        type: 'recommendation',
        offerId: best.offer.id,
      })
    }
  }

  if (notificationsToCreate.length > 0) {
    await db.notification.createMany({ data: notificationsToCreate })
  }
}

async function runSingleScraper(
  operatorName: string,
  operatorSlug: string,
  scraperFn: (emit: (level: 'INFO' | 'OK' | 'WARN' | 'ERROR', msg: string) => void) => Promise<any[]>
): Promise<ScrapeResult> {
  const startedAt = new Date()

  // Collect structured log entries for storage
  const logBuffer: Array<{ ts: number; level: string; msg: string }> = []
  const emit = (level: 'INFO' | 'OK' | 'WARN' | 'ERROR', msg: string) => {
    logBuffer.push({ ts: Date.now(), level, msg })
    console.log(`[${operatorName}][${level}] ${msg}`)
  }

  // Find or create operator record
  const operator = await db.operator.upsert({
    where: { slug: operatorSlug },
    update: {},
    create: {
      name: operatorName,
      slug: operatorSlug,
      websiteUrl: getOperatorUrl(operatorSlug),
      primaryColor: getOperatorColor(operatorSlug),
    },
  })

  // Create scrape log entry
  const scrapeLog = await db.scrapeLog.create({
    data: {
      operatorId: operator.id,
      status: ScrapeStatus.RUNNING,
      startedAt,
    },
  })

  let offersAdded = 0
  let offersUpdated = 0
  let errorMessage: string | undefined

  try {
    emit('INFO', `Starting ${operatorName} scrape`)
    const rawOffers = await scraperFn(emit)

    // Validation gate — defense in depth. Each scraper already calls validateOffer()
    // before pushing, so this is the final guard. Reject anything that slipped through.
    const validated: any[] = []
    let rejectedCount = 0
    for (const o of rawOffers) {
      const v = validateOffer(o)
      if (v.valid) {
        validated.push(o)
      } else {
        rejectedCount++
        emit('WARN', `Rejected "${o.name || '(no name)'}" — ${v.reason}`)
      }
    }
    if (rejectedCount > 0) {
      emit('WARN', `Validation rejected ${rejectedCount} offer(s) from this scrape`)
    }

    // Dedupe by slug — a browser-rendered page can yield the same plan more than
    // once (carousel libraries clone slides for their loop effect). Keep first.
    const seenSlugs = new Set<string>()
    const validOffers = validated.filter(o => {
      const slug = slugify(o.name)
      if (seenSlugs.has(slug)) return false
      seenSlugs.add(slug)
      return true
    })
    const dupeCount = validated.length - validOffers.length
    if (dupeCount > 0) {
      emit('WARN', `Removed ${dupeCount} duplicate offer(s) from this scrape`)
    }

    const scrapedSlugs: string[] = []

    for (const rawOffer of validOffers) {
      const offerSlug = slugify(rawOffer.name)
      scrapedSlugs.push(offerSlug)

      const existing = await db.offer.findUnique({
        where: { operatorId_slug: { operatorId: operator.id, slug: offerSlug } },
      })

      const offerData = {
        operatorId: operator.id,
        name: rawOffer.name,
        slug: offerSlug,
        type: rawOffer.type as OfferType,
        priceDA: rawOffer.priceDA,
        dataGB: rawOffer.dataGB,
        voiceMinutes: rawOffer.voiceMinutes ?? 0,
        smsCount: rawOffer.smsCount ?? 0,
        validityDays: rawOffer.validityDays,
        network: rawOffer.network,
        features: JSON.stringify(rawOffer.features || []),
        sourceUrl: rawOffer.sourceUrl,
        scrapedAt: new Date(),
        isActive: true,
      }

      if (existing) {
        const priceChanged = existing.priceDA !== rawOffer.priceDA
        const priceDropped = rawOffer.priceDA < existing.priceDA
        await db.offer.update({ where: { id: existing.id }, data: offerData })
        offersUpdated++
        if (priceChanged) {
          await db.priceHistory.create({ data: { offerId: existing.id, priceDA: rawOffer.priceDA } })
          if (priceDropped) {
            await notifyUsersPriceDrop(existing, rawOffer.priceDA, operatorName)
          }
        }
      } else {
        const created = await db.offer.create({ data: offerData })
        offersAdded++
        // Log initial price in history
        await db.priceHistory.create({ data: { offerId: created.id, priceDA: rawOffer.priceDA } })
        // Notify users about new offer
        await notifyUsersNewOffer(rawOffer, operatorName, created.id)
      }
    }

    // Per-operator deactivation: the scrape result (live + fallback) is the full
    // authoritative catalogue for this operator. Any active offer NOT in the
    // result is stale and gets deactivated — this keeps the DB in sync and
    // prevents ghost offers from accumulating across runs.
    // Safety guard: if the scrape returned suspiciously few offers (likely a
    // broken run), skip deactivation rather than wipe the catalogue.
    let deactivatedCount = 0
    const currentActive = await db.offer.count({
      where: { operatorId: operator.id, isActive: true },
    })
    if (validOffers.length >= Math.max(1, currentActive * 0.5)) {
      const deactivated = await db.offer.updateMany({
        where: { operatorId: operator.id, isActive: true, slug: { notIn: scrapedSlugs } },
        data: { isActive: false },
      })
      deactivatedCount = deactivated.count
      if (deactivatedCount > 0) {
        emit('WARN', `Deactivated ${deactivatedCount} stale offer(s) no longer in the operator catalogue`)
      }
    } else {
      emit('WARN', `Skipping deactivation — scrape returned ${validOffers.length} offers vs ${currentActive} active (suspicious, possible broken run)`)
    }

    const duration = Date.now() - startedAt.getTime()
    emit('INFO', `DB sync complete — +${offersAdded} added, ${offersUpdated} updated, ${deactivatedCount} deactivated in ${(duration / 1000).toFixed(1)}s`)

    await db.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: ScrapeStatus.SUCCESS,
        offersFound: validOffers.length,
        offersAdded,
        offersUpdated,
        offersDeactivated: deactivatedCount,
        duration,
        details: JSON.stringify(logBuffer),
        completedAt: new Date(),
      },
    })

    return {
      operator: operatorName,
      status: ScrapeStatus.SUCCESS,
      offersFound: validOffers.length,
      offersAdded,
      offersUpdated,
      offersDeactivated: deactivatedCount,
      duration,
    }
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error'
    emit('ERROR', `Scrape failed: ${errorMessage}`)
    const duration = Date.now() - startedAt.getTime()

    await db.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: ScrapeStatus.FAILED,
        offersFound: offersAdded + offersUpdated,
        offersAdded,
        offersUpdated,
        errorMessage,
        duration,
        details: JSON.stringify(logBuffer),
        completedAt: new Date(),
      },
    })

    return {
      operator: operatorName,
      status: ScrapeStatus.FAILED,
      offersFound: 0,
      offersAdded,
      offersUpdated,
      offersDeactivated: 0,
      errorMessage,
      duration,
    }
  }
}

async function notifyUsersNewOffer(rawOffer: any, operatorName: string, offerId: string) {
  // User-facing alert — admins are excluded (they get the scrape-complete summary).
  const users = await db.user.findMany({ where: { role: 'USER' }, include: { profile: true } })
  if (users.length === 0) return

  const notificationsToCreate = []

  for (const user of users) {
    // Skip if offer doesn't match strict user preferences
    if (user.profile) {
      const p = user.profile
      if (p.preferredType && p.preferredType !== 'any' && p.preferredType !== rawOffer.type) continue
      if (p.preferredNet && p.preferredNet !== 'any' && !rawOffer.network.includes(p.preferredNet)) continue
    }

    notificationsToCreate.push({
      userId: user.id,
      offerId,
      title: `New offer from ${operatorName}!`,
      message: `${operatorName} just released: ${rawOffer.name}. Compare now!`,
      type: 'new_offer',
    })
  }

  if (notificationsToCreate.length > 0) {
    await db.notification.createMany({ data: notificationsToCreate })
  }
}

async function notifyUsersPriceDrop(offer: any, newPrice: number, operatorName: string) {
  // User-facing alert — admins are excluded (they get the scrape-complete summary).
  const users = await db.user.findMany({ where: { role: 'USER' }, include: { profile: true } })
  if (users.length === 0) return

  const saving = Math.round(((offer.priceDA - newPrice) / offer.priceDA) * 100)
  const notificationsToCreate = []

  for (const user of users) {
    if (user.profile) {
      const p = user.profile
      if (p.preferredType && p.preferredType !== 'any' && p.preferredType !== offer.type) continue
      if (p.preferredNet && p.preferredNet !== 'any' && !offer.network.includes(p.preferredNet)) continue
    }
    notificationsToCreate.push({
      userId: user.id,
      offerId: offer.id,
      title: `Price drop! ${offer.name}`,
      message: `${operatorName}'s ${offer.name} dropped from ${offer.priceDA} DA to ${newPrice} DA (−${saving}%).`,
      type: 'price_drop',
    })
  }

  if (notificationsToCreate.length > 0) {
    await db.notification.createMany({ data: notificationsToCreate })
  }
}

function getOperatorUrl(slug: string): string {
  const urls: Record<string, string> = {
    djezzy: 'https://www.djezzy.dz/',
    ooredoo: 'https://www.ooredoo.dz/',
    mobilis: 'https://mobilis.dz/',
  }
  return urls[slug] || ''
}

function getOperatorColor(slug: string): string {
  const colors: Record<string, string> = {
    djezzy: '#E30613',
    ooredoo: '#E20074',
    mobilis: '#00A651',
  }
  return colors[slug] || '#333333'
}
