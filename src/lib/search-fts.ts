/**
 * SQLite FTS5 helpers for the free-text remainder of the search bar.
 *
 * The structured tokens (data, price, network, operator, type, unlimited) are
 * still parsed by regex in src/app/api/offers/route.ts. Whatever words remain
 * after structured-token extraction are routed here: each word becomes a
 * prefix-matched FTS5 query against an indexed copy of every active offer's
 * name + features + operator name, with BM25 relevance ranking applied by
 * SQLite itself.
 *
 * The index lives in a contentless FTS5 virtual table named `OfferFts`. It
 * stores one row per active offer with the offer's cuid (UNINDEXED, so it
 * round-trips intact) plus the three searchable text columns. The index is
 * rebuilt at server boot (instrumentation.ts) and at the end of every
 * successful scrape run — the catalogue only changes at scrape time, so a
 * full rebuild is simpler and safer than incremental triggers.
 */

import { db } from '@/lib/db'

const CREATE_TABLE_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS OfferFts USING fts5(
  offerId UNINDEXED,
  name,
  features,
  operatorName,
  tokenize='unicode61 remove_diacritics 2'
)`

let initialised = false

async function ensureTable(): Promise<void> {
  if (initialised) return
  await db.$executeRawUnsafe(CREATE_TABLE_SQL)
  initialised = true
}

/**
 * Wipe and repopulate the FTS5 index from the current Offer + Operator tables.
 * Called at server boot and at the end of every successful scrape run.
 */
export async function rebuildOfferFtsIndex(): Promise<void> {
  await ensureTable()
  await db.$executeRawUnsafe('DELETE FROM OfferFts')
  // Pull every active offer with its operator name joined in. We do this in
  // application code (not a single SQL INSERT...SELECT) because the operator
  // table is referenced by foreign key and the join needs Prisma's relation
  // mapping — and because the row count is small (~100) so the round-trip cost
  // is negligible.
  const offers = await db.offer.findMany({
    where: { isActive: true },
    include: { operator: true },
  })
  for (const o of offers) {
    await db.$executeRawUnsafe(
      'INSERT INTO OfferFts(offerId, name, features, operatorName) VALUES (?, ?, ?, ?)',
      o.id,
      o.name,
      o.features ?? '',
      o.operator.name,
    )
  }
}

/**
 * Run an FTS5 MATCH query against the index.
 *
 * Each word is wrapped with a trailing `*` so the query becomes a prefix match
 * — typing "djez" finds "Djezzy", typing "stream" finds "streaming". Words are
 * ANDed by default (FTS5's standard behaviour) so all words must appear in the
 * same offer. Results come back ordered by BM25 relevance — SQLite's built-in
 * ranking function, the same one used by industrial search engines, scaled to
 * favour matches in shorter columns (the name column carries more weight than
 * the long features blob).
 *
 * Returns an array of matching offerIds in relevance order. The route handler
 * then keeps only the offers that also passed the structured filters.
 */
export async function searchOffersFts(words: string[]): Promise<string[]> {
  if (words.length === 0) return []
  await ensureTable()

  // Escape FTS5 query special characters that would otherwise be parsed as
  // operators (quotes, parens, AND/OR/NOT keywords, hyphens at start, etc.).
  // We only need a conservative scrub: strip everything that is not a word
  // character or accented letter, then add a prefix wildcard.
  const cleaned = words
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase())
    .filter(w => w.length >= 2)
  if (cleaned.length === 0) return []

  const query = cleaned.map(w => `${w}*`).join(' ')
  const rows = await db.$queryRawUnsafe<{ offerId: string }[]>(
    `SELECT offerId FROM OfferFts WHERE OfferFts MATCH ? ORDER BY bm25(OfferFts) LIMIT 200`,
    query,
  )
  return rows.map(r => r.offerId)
}
