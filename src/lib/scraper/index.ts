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

export interface ScrapeResult {
  operator: string
  status: ScrapeStatus
  offersFound: number
  offersAdded: number
  offersUpdated: number
  errorMessage?: string
  duration: number
}

export async function runAllScrapers(): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = []

  const jobs = [
    { name: 'Djezzy', slug: 'djezzy', fn: scrapeDjezzy },
    { name: 'Ooredoo', slug: 'ooredoo', fn: scrapeOoredoo },
    { name: 'Mobilis', slug: 'mobilis', fn: scrapeMobilis },
  ]

  for (const job of jobs) {
    const result = await runSingleScraper(job.name, job.slug, job.fn)
    results.push(result)
  }

  return results
}

async function runSingleScraper(
  operatorName: string,
  operatorSlug: string,
  scraperFn: () => Promise<any[]>
): Promise<ScrapeResult> {
  const startedAt = new Date()

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
    const rawOffers = await scraperFn()

    for (const rawOffer of rawOffers) {
      const offerSlug = slugify(rawOffer.name)

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
        await db.offer.update({ where: { id: existing.id }, data: offerData })
        offersUpdated++
      } else {
        await db.offer.create({ data: offerData })
        offersAdded++

        // Notify users about new offer
        await notifyUsersNewOffer(rawOffer.name, operatorName)
      }
    }

    const duration = Date.now() - startedAt.getTime()

    await db.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: ScrapeStatus.SUCCESS,
        offersFound: rawOffers.length,
        offersAdded,
        offersUpdated,
        duration,
        completedAt: new Date(),
      },
    })

    return {
      operator: operatorName,
      status: ScrapeStatus.SUCCESS,
      offersFound: rawOffers.length,
      offersAdded,
      offersUpdated,
      duration,
    }
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error'
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
        completedAt: new Date(),
      },
    })

    return {
      operator: operatorName,
      status: ScrapeStatus.FAILED,
      offersFound: 0,
      offersAdded,
      offersUpdated,
      errorMessage,
      duration,
    }
  }
}

async function notifyUsersNewOffer(offerName: string, operatorName: string) {
  const users = await db.user.findMany({ select: { id: true } })
  if (users.length === 0) return

  await db.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      title: `Nouvelle offre ${operatorName}!`,
      message: `${operatorName} vient de lancer : ${offerName}. Comparez maintenant!`,
      type: 'new_offer',
    })),
  })
}

function getOperatorUrl(slug: string): string {
  const urls: Record<string, string> = {
    djezzy: 'https://www.djezzy5g.dz/',
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
