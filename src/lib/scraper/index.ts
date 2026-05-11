/**
 * Scrape Orchestrator
 * Runs all three scrapers, upserts results to DB, logs everything.
 * Called daily by cron or manually via Admin panel.
 */
import { db } from '@/lib/db'
import { scrapeDjezzy } from './djezzy'
import { scrapeOoredoo } from './ooredoo'
import { scrapeMobilis } from './mobilis'
import { OfferType, ScrapeStatus } from '@prisma/client'
import { slugify } from '@/lib/utils'
import { recommendOffers, UserNeeds } from '../recommendation'

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

  return results
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
    type: 'new_offer' as const,
  }))

  await db.notification.createMany({ data: notifications })
}

async function notifyPersonalizedRecommendations() {
  const usersWithProfiles = await db.user.findMany({
    where: { profile: { isNot: null } },
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
    }

    const matches = recommendOffers(allOffers, needs, 1)
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

    // Reject offers with no useful data — price-only scrapes are useless
    const validOffers = rawOffers.filter(o =>
      o.dataGB > 0 || o.voiceMinutes !== 0 || o.smsCount !== 0
    )

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
        await notifyUsersNewOffer(rawOffer, operatorName)
      }
    }

    // Per-family deactivation: group offers by sourceUrl (= one URL per plan family).
    // For each family, if we got at least one offer this run, deactivate any DB
    // entries from that URL whose slug is no longer in the scrape result.
    // This detects operator plan removals precisely without a global count guard
    // that would block all cleanup when the total scrape count differs from DB total.
    const scrapedByUrl = new Map<string, string[]>()
    for (const offer of validOffers) {
      if (!scrapedByUrl.has(offer.sourceUrl)) scrapedByUrl.set(offer.sourceUrl, [])
      scrapedByUrl.get(offer.sourceUrl)!.push(slugify(offer.name))
    }

    let deactivatedCount = 0
    for (const [sourceUrl, slugs] of scrapedByUrl) {
      if (slugs.length === 0) continue
      const deactivated = await db.offer.updateMany({
        where: { operatorId: operator.id, isActive: true, sourceUrl, slug: { notIn: slugs } },
        data: { isActive: false },
      })
      deactivatedCount += deactivated.count
    }
    if (deactivatedCount > 0) {
      emit('WARN', `Deactivated ${deactivatedCount} offer(s) no longer present on operator website`)
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

async function notifyUsersNewOffer(rawOffer: any, operatorName: string) {
  const users = await db.user.findMany({ include: { profile: true } })
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
  const users = await db.user.findMany({ include: { profile: true } })
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
