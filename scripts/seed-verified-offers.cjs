'use strict'
/**
 * Seed verified offer data directly into SQLite.
 * Run with: node scripts/seed-verified-offers.cjs
 * Verified: 2026-05-02
 */
const Database = require('better-sqlite3')
const crypto = require('crypto')

const db = new Database('./prisma/dev.db')
const now = new Date().toISOString()

function cuid() {
  return 'c' + crypto.randomBytes(11).toString('base64url').toLowerCase().slice(0, 23)
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const OPS = db.prepare('SELECT id, slug FROM Operator').all()
const opId = slug => OPS.find(o => o.slug === slug)?.id

// ─── Offer definitions ───────────────────────────────────────────────────────

const DJEZZY_ID = opId('djezzy')
const OOREDOO_ID = opId('ooredoo')
const MOBILIS_ID = opId('mobilis')

const BASE_DJ = 'https://www.djezzy.dz/particuliers/offres/'
const BASE_OO = 'https://www.ooredoo.dz/particuliers/offres-mobiles/'

const offers = [
  // ─── DJEZZY ──────────────────────────────────────────────────────────────

  // LEGEND prepaid
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 100',           type: 'PREPAID',   priceDA: 100,   dataGB: 1,    voiceMinutes: -1, smsCount: -1, validityDays: 1,   network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Data rollover']),                                          sourceUrl: BASE_DJ+'djezzy-legend/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 1000',          type: 'PREPAID',   priceDA: 1000,  dataGB: 15,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Data rollover']),                                          sourceUrl: BASE_DJ+'djezzy-legend/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 1500',          type: 'PREPAID',   priceDA: 1500,  dataGB: 45,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Data rollover']),                                          sourceUrl: BASE_DJ+'djezzy-legend/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 2000',          type: 'PREPAID',   priceDA: 2000,  dataGB: 70,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited Djezzy SMS','Data rollover']),                                  sourceUrl: BASE_DJ+'djezzy-legend/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 2000 Max',      type: 'PREPAID',   priceDA: 2000,  dataGB: 90,   voiceMinutes: 350, smsCount: -1, validityDays: 30, network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','350 min to other operators','Unlimited Djezzy SMS','Data rollover']),            sourceUrl: BASE_DJ+'djezzy-legend/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 2500',          type: 'PREPAID',   priceDA: 2500,  dataGB: 120,  voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited Djezzy SMS','Data rollover']),                                  sourceUrl: BASE_DJ+'djezzy-legend/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 3000',          type: 'PREPAID',   priceDA: 3000,  dataGB: 145,  voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited Djezzy SMS','Data rollover']),                                  sourceUrl: BASE_DJ+'djezzy-legend/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND 4000',          type: 'PREPAID',   priceDA: 4000,  dataGB: 200,  voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited Djezzy SMS','Data rollover']),                                  sourceUrl: BASE_DJ+'djezzy-legend/' },

  // IZZY! prepaid
  { op: DJEZZY_ID, name: 'IZZY! 50',                    type: 'PREPAID',   priceDA: 50,    dataGB: 1,    voiceMinutes: -1, smsCount: -1, validityDays: 1,   network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS','Optional add-ons']),                                       sourceUrl: BASE_DJ+'izzy-game-changer/' },
  { op: DJEZZY_ID, name: 'IZZY! 300',                   type: 'PREPAID',   priceDA: 300,   dataGB: 3,    voiceMinutes: -1, smsCount: -1, validityDays: 15,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS','Optional add-ons (YouTube, social)']),                    sourceUrl: BASE_DJ+'izzy-game-changer/' },
  { op: DJEZZY_ID, name: 'IZZY! 500',                   type: 'PREPAID',   priceDA: 500,   dataGB: 5,    voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS']),                                                          sourceUrl: BASE_DJ+'izzy-game-changer/' },
  { op: DJEZZY_ID, name: 'IZZY! 1200',                  type: 'PREPAID',   priceDA: 1200,  dataGB: 10,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS','Free YouTube','1000 DA credit']),                          sourceUrl: BASE_DJ+'izzy-game-changer/' },

  // ZID prepaid
  { op: DJEZZY_ID, name: 'Djezzy ZID 50',               type: 'PREPAID',   priceDA: 50,    dataGB: 0.5,  voiceMinutes: -1, smsCount: -1, validityDays: 1,   network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS']),                                                          sourceUrl: BASE_DJ+'djezzy-zid/' },
  { op: DJEZZY_ID, name: 'Djezzy ZID 100',              type: 'PREPAID',   priceDA: 100,   dataGB: 1,    voiceMinutes: -1, smsCount: -1, validityDays: 1,   network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS']),                                                          sourceUrl: BASE_DJ+'djezzy-zid/' },
  { op: DJEZZY_ID, name: 'Djezzy ZID 200',              type: 'PREPAID',   priceDA: 200,   dataGB: 2,    voiceMinutes: -1, smsCount: -1, validityDays: 7,   network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS']),                                                          sourceUrl: BASE_DJ+'djezzy-zid/' },
  { op: DJEZZY_ID, name: 'Djezzy ZID 500',              type: 'PREPAID',   priceDA: 500,   dataGB: 5,    voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS']),                                                          sourceUrl: BASE_DJ+'djezzy-zid/' },
  { op: DJEZZY_ID, name: 'Djezzy ZID 1000',             type: 'PREPAID',   priceDA: 1000,  dataGB: 15,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS']),                                                          sourceUrl: BASE_DJ+'djezzy-zid/' },
  { op: DJEZZY_ID, name: 'Djezzy ZID 1500',             type: 'PREPAID',   priceDA: 1500,  dataGB: 40,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS']),                                                          sourceUrl: BASE_DJ+'djezzy-zid/' },

  // CAMPUCE student prepaid
  { op: DJEZZY_ID, name: 'Djezzy CAMPUCE 100',          type: 'PREPAID',   priceDA: 100,   dataGB: 1,    voiceMinutes: -1, smsCount: -1, validityDays: 1,   network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Student offer','Free SIM','1 GB Friday bonus/week']),    sourceUrl: BASE_DJ+'offre-djezzy-campuce/' },
  { op: DJEZZY_ID, name: 'Djezzy CAMPUCE 400',          type: 'PREPAID',   priceDA: 400,   dataGB: 5,    voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Student offer','20% discount','1 GB Friday bonus/week']), sourceUrl: BASE_DJ+'offre-djezzy-campuce/' },
  { op: DJEZZY_ID, name: 'Djezzy CAMPUCE 800',          type: 'PREPAID',   priceDA: 800,   dataGB: 15,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Student offer','1 GB Friday bonus/week']),               sourceUrl: BASE_DJ+'offre-djezzy-campuce/' },
  { op: DJEZZY_ID, name: 'Djezzy CAMPUCE 1200',         type: 'PREPAID',   priceDA: 1200,  dataGB: 40,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Student offer','1 GB Friday bonus/week']),               sourceUrl: BASE_DJ+'offre-djezzy-campuce/' },
  { op: DJEZZY_ID, name: 'Djezzy CAMPUCE 1600',         type: 'PREPAID',   priceDA: 1600,  dataGB: 70,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','50 SMS to other operators','Student offer','1 GB Friday bonus/week']),          sourceUrl: BASE_DJ+'offre-djezzy-campuce/' },

  // LEGEND MAX postpaid
  { op: DJEZZY_ID, name: 'Djezzy LEGEND MAX 1500',      type: 'POSTPAID',  priceDA: 1500,  dataGB: 50,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Monthly plan','International credit included']),         sourceUrl: BASE_DJ+'legend-max/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND MAX 2000',      type: 'POSTPAID',  priceDA: 2000,  dataGB: 70,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited Djezzy SMS','100 SMS to other operators','Monthly plan']),   sourceUrl: BASE_DJ+'legend-max/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND MAX 2000 Plus', type: 'POSTPAID',  priceDA: 2000,  dataGB: 80,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Monthly plan','15 min international calls']),           sourceUrl: BASE_DJ+'legend-max/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND MAX 2500',      type: 'POSTPAID',  priceDA: 2500,  dataGB: 100,  voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited calls (all networks)','Unlimited Djezzy SMS','150 SMS to other operators','Monthly plan']),  sourceUrl: BASE_DJ+'legend-max/' },
  { op: DJEZZY_ID, name: 'Djezzy LEGEND MAX 3000',      type: 'POSTPAID',  priceDA: 3000,  dataGB: 150,  voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Monthly plan','30 min international calls']),           sourceUrl: BASE_DJ+'legend-max/' },

  // CONFORT PARTAGE postpaid
  { op: DJEZZY_ID, name: 'Djezzy CONFORT PARTAGE 1500', type: 'POSTPAID',  priceDA: 1500,  dataGB: 50,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Shareable secondary SIM','Monthly plan']),             sourceUrl: BASE_DJ+'djezzy-confort-2/' },
  { op: DJEZZY_ID, name: 'Djezzy CONFORT PARTAGE 2000', type: 'POSTPAID',  priceDA: 2000,  dataGB: 80,   voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Shareable secondary SIM','Monthly plan','15 min international']), sourceUrl: BASE_DJ+'djezzy-confort-2/' },
  { op: DJEZZY_ID, name: 'Djezzy CONFORT PARTAGE 3000', type: 'POSTPAID',  priceDA: 3000,  dataGB: 150,  voiceMinutes: -1, smsCount: -1, validityDays: 30,  network: '4G',     features: JSON.stringify(['Unlimited Djezzy calls','Unlimited Djezzy SMS','Shareable secondary SIM','Monthly plan','30 min international']), sourceUrl: BASE_DJ+'djezzy-confort-2/' },

  // DjezzyNet daily data-only
  { op: DJEZZY_ID, name: 'DjezzyNet Daily 15 DA',       type: 'DATA_ONLY', priceDA: 15,    dataGB: 0.3,  voiceMinutes: 0,  smsCount: 0,  validityDays: 1,   network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Daily 25 DA',       type: 'DATA_ONLY', priceDA: 25,    dataGB: 0.6,  voiceMinutes: 0,  smsCount: 0,  validityDays: 1,   network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Daily 50 DA',       type: 'DATA_ONLY', priceDA: 50,    dataGB: 2,    voiceMinutes: 0,  smsCount: 0,  validityDays: 1,   network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Daily 150 DA',      type: 'DATA_ONLY', priceDA: 150,   dataGB: 5,    voiceMinutes: 0,  smsCount: 0,  validityDays: 1,   network: '4G',     features: JSON.stringify(['Activate via *720#']),                                                                                   sourceUrl: BASE_DJ+'offres-internet/' },
  // DjezzyNet weekly data-only
  { op: DJEZZY_ID, name: 'DjezzyNet Weekly 75 DA',      type: 'DATA_ONLY', priceDA: 75,    dataGB: 4,    voiceMinutes: 0,  smsCount: 0,  validityDays: 7,   network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Weekly 150 DA',     type: 'DATA_ONLY', priceDA: 150,   dataGB: 10,   voiceMinutes: 0,  smsCount: 0,  validityDays: 7,   network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Weekly 500 DA',     type: 'DATA_ONLY', priceDA: 500,   dataGB: 20,   voiceMinutes: 0,  smsCount: 0,  validityDays: 7,   network: '4G',     features: JSON.stringify([]),                                                                                                        sourceUrl: BASE_DJ+'offres-internet/' },
  // DjezzyNet monthly data-only
  { op: DJEZZY_ID, name: 'DjezzyNet Monthly 250 DA',    type: 'DATA_ONLY', priceDA: 250,   dataGB: 12,   voiceMinutes: 0,  smsCount: 0,  validityDays: 30,  network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Monthly 500 DA',    type: 'DATA_ONLY', priceDA: 500,   dataGB: 30,   voiceMinutes: 0,  smsCount: 0,  validityDays: 30,  network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Monthly 750 DA',    type: 'DATA_ONLY', priceDA: 750,   dataGB: 60,   voiceMinutes: 0,  smsCount: 0,  validityDays: 30,  network: '4G',     features: JSON.stringify(['50% discount on 2nd subscription']),                                                                     sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Monthly 2000 DA',   type: 'DATA_ONLY', priceDA: 2000,  dataGB: 100,  voiceMinutes: 0,  smsCount: 0,  validityDays: 30,  network: '4G',     features: JSON.stringify([]),                                                                                                        sourceUrl: BASE_DJ+'offres-internet/' },
  { op: DJEZZY_ID, name: 'DjezzyNet Monthly 4000 DA',   type: 'DATA_ONLY', priceDA: 4000,  dataGB: 220,  voiceMinutes: 0,  smsCount: 0,  validityDays: 30,  network: '4G',     features: JSON.stringify(['Bonus app data available']),                                                                             sourceUrl: BASE_DJ+'offres-internet/' },
  // 3ayla / SIM Internet
  { op: DJEZZY_ID, name: 'Djezzy SIM Internet 1000 DA', type: 'DATA_ONLY', priceDA: 1000,  dataGB: 15,   voiceMinutes: 0,  smsCount: 0,  validityDays: 30,  network: '4G',     features: JSON.stringify(['Internet SIM','4G modem compatible','Activate via *720#']),                                              sourceUrl: BASE_DJ+'nouveaux-forfaits-internet-de-djezzy/' },
  { op: DJEZZY_ID, name: 'Djezzy SIM Internet 1500 DA', type: 'DATA_ONLY', priceDA: 1500,  dataGB: 50,   voiceMinutes: 0,  smsCount: 0,  validityDays: 30,  network: '4G',     features: JSON.stringify(['Internet SIM','4G modem compatible']),                                                                   sourceUrl: BASE_DJ+'nouveaux-forfaits-internet-de-djezzy/' },
  { op: DJEZZY_ID, name: 'Djezzy 3ayla 3 Months',       type: 'DATA_ONLY', priceDA: 2500,  dataGB: 60,   voiceMinutes: 0,  smsCount: 0,  validityDays: 90,  network: '4G',     features: JSON.stringify(['Family internet plan','4G modem bundle option']),                                                         sourceUrl: BASE_DJ+'djezzy-3ayla/' },
  { op: DJEZZY_ID, name: 'Djezzy 3ayla 6 Months',       type: 'DATA_ONLY', priceDA: 4000,  dataGB: 150,  voiceMinutes: 0,  smsCount: 0,  validityDays: 180, network: '4G',     features: JSON.stringify(['Family internet plan','4G modem bundle option']),                                                         sourceUrl: BASE_DJ+'djezzy-3ayla/' },
  { op: DJEZZY_ID, name: 'Djezzy 3ayla Annual',         type: 'DATA_ONLY', priceDA: 7500,  dataGB: 350,  voiceMinutes: 0,  smsCount: 0,  validityDays: 365, network: '4G',     features: JSON.stringify(['Annual plan','Family internet','4G modem compatible']),                                                    sourceUrl: BASE_DJ+'djezzy-3ayla/' },

  // ─── OOREDOO ─────────────────────────────────────────────────────────────

  // Dima Ooredoo prepaid
  { op: OOREDOO_ID, name: 'Dima Ooredoo 50',            type: 'PREPAID',   priceDA: 50,    dataGB: 0.2,  voiceMinutes: 30,  smsCount: 0,  validityDays: 1,  network: '4G/5G',  features: JSON.stringify(['5G compatible']),                                                                                         sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 100',           type: 'PREPAID',   priceDA: 100,   dataGB: 0.5,  voiceMinutes: -1,  smsCount: -1, validityDays: 1,  network: '4G/5G',  features: JSON.stringify(['Unlimited calls (all networks)','Free Facebook & Messenger','5G compatible']),                            sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 500',           type: 'PREPAID',   priceDA: 500,   dataGB: 3,    voiceMinutes: 100, smsCount: 50, validityDays: 15, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','ANAZIK music subscription','5G compatible']),                                   sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 750',           type: 'PREPAID',   priceDA: 750,   dataGB: 10,   voiceMinutes: -1,  smsCount: 0,  validityDays: 14, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Free Facebook','5G compatible']),                                               sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 1200',          type: 'PREPAID',   priceDA: 1200,  dataGB: 8,    voiceMinutes: 100, smsCount: 120,validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','ANAZIK music subscription','5G compatible']),                                   sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 1500',          type: 'PREPAID',   priceDA: 1500,  dataGB: 30,   voiceMinutes: 150, smsCount: 150,validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','ANAFLIX film/series subscription','5G compatible']),                           sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 2000',          type: 'PREPAID',   priceDA: 2000,  dataGB: 50,   voiceMinutes: 300, smsCount: 200,validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','ANAZIK music subscription','ANAFLIX film/series subscription','5G compatible']),sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 2500',          type: 'PREPAID',   priceDA: 2500,  dataGB: 100,  voiceMinutes: -1,  smsCount: 100,validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited calls (all networks)','ANAZIK music subscription','ANAFLIX film/series subscription','SHAHID subscription','5G compatible']), sourceUrl: BASE_OO+'dima-ooredoo' },
  { op: OOREDOO_ID, name: 'Dima Ooredoo 4000',          type: 'PREPAID',   priceDA: 4000,  dataGB: 200,  voiceMinutes: -1,  smsCount: 200,validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited calls (all networks)','5G compatible']),                                                         sourceUrl: BASE_OO+'dima-ooredoo' },

  // N'YOOZ prepaid
  { op: OOREDOO_ID, name: "N'YOOZ 30",                  type: 'PREPAID',   priceDA: 30,    dataGB: 0.2,  voiceMinutes: 0,   smsCount: 0,  validityDays: 1,  network: '4G/5G',  features: JSON.stringify(['Unlimited Facebook & Messenger','Free Snapchat','5G compatible']),                                       sourceUrl: BASE_OO+'n-yooz' },
  { op: OOREDOO_ID, name: "N'YOOZ 100",                 type: 'PREPAID',   priceDA: 100,   dataGB: 1,    voiceMinutes: 10,  smsCount: -1, validityDays: 1,  network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Free Facebook & Messenger','Free Snapchat','5G compatible']),                   sourceUrl: BASE_OO+'n-yooz' },
  { op: OOREDOO_ID, name: "N'YOOZ 200",                 type: 'PREPAID',   priceDA: 200,   dataGB: 2.5,  voiceMinutes: 40,  smsCount: -1, validityDays: 1,  network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Free Facebook & Messenger','Free Snapchat','Free YouTube','5G compatible']),    sourceUrl: BASE_OO+'n-yooz' },
  { op: OOREDOO_ID, name: "N'YOOZ 300",                 type: 'PREPAID',   priceDA: 300,   dataGB: 3,    voiceMinutes: 30,  smsCount: 30, validityDays: 14, network: '4G/5G',  features: JSON.stringify(['Free Snapchat','Double data via My Ooredoo app','5G compatible']),                                         sourceUrl: BASE_OO+'n-yooz' },
  { op: OOREDOO_ID, name: "N'YOOZ 500",                 type: 'PREPAID',   priceDA: 500,   dataGB: 7,    voiceMinutes: 50,  smsCount: 50, validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Free Snapchat','2 GB bonus included','5G compatible']),                                                     sourceUrl: BASE_OO+'n-yooz' },
  { op: OOREDOO_ID, name: "N'YOOZ 1000",                type: 'PREPAID',   priceDA: 1000,  dataGB: 15,   voiceMinutes: 100, smsCount: -1, validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Free Snapchat','5G compatible']),                                               sourceUrl: BASE_OO+'n-yooz' },
  { op: OOREDOO_ID, name: "N'YOOZ 1500",                type: 'PREPAID',   priceDA: 1500,  dataGB: 30,   voiceMinutes: 150, smsCount: -1, validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Free Facebook & Messenger','Free Snapchat','5G compatible']),                   sourceUrl: BASE_OO+'n-yooz' },

  // Scholar student prepaid
  { op: OOREDOO_ID, name: 'Ooredoo Scholar 500',        type: 'PREPAID',   priceDA: 500,   dataGB: 9,    voiceMinutes: -1,  smsCount: 0,  validityDays: 28, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Student offer','2 GB app bonus','5G compatible']),                             sourceUrl: BASE_OO+'ooredoo-scholar' },
  { op: OOREDOO_ID, name: 'Ooredoo Scholar 1000',       type: 'PREPAID',   priceDA: 1000,  dataGB: 25,   voiceMinutes: -1,  smsCount: 0,  validityDays: 28, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Student offer','5 GB app bonus','5G compatible']),                             sourceUrl: BASE_OO+'ooredoo-scholar' },
  { op: OOREDOO_ID, name: 'Ooredoo Scholar 1500',       type: 'PREPAID',   priceDA: 1500,  dataGB: 60,   voiceMinutes: -1,  smsCount: 0,  validityDays: 28, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Student offer','10 GB app bonus','5G compatible']),                            sourceUrl: BASE_OO+'ooredoo-scholar' },
  { op: OOREDOO_ID, name: 'Ooredoo Scholar 2000',       type: 'PREPAID',   priceDA: 2000,  dataGB: 90,   voiceMinutes: -1,  smsCount: 0,  validityDays: 28, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','Student offer','10 GB app bonus','5G compatible']),                            sourceUrl: BASE_OO+'ooredoo-scholar' },
  { op: OOREDOO_ID, name: 'Ooredoo Scholar 2500',       type: 'PREPAID',   priceDA: 2500,  dataGB: 140,  voiceMinutes: -1,  smsCount: 100,validityDays: 28, network: '4G/5G',  features: JSON.stringify(['Unlimited calls (all networks)','Student offer','20 GB app bonus','5G compatible','Multi-month discount available']), sourceUrl: BASE_OO+'ooredoo-scholar' },
  // Ooredoo 500
  { op: OOREDOO_ID, name: 'Ooredoo 500',                type: 'PREPAID',   priceDA: 500,   dataGB: 5,    voiceMinutes: -1,  smsCount: 0,  validityDays: 28, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','500 DA national credit','5G compatible','Multi-cycle packs available (up to 25% savings)']), sourceUrl: BASE_OO+'ooredoo-500' },

  // POP postpaid
  { op: OOREDOO_ID, name: 'Ooredoo POP 1500',           type: 'POSTPAID',  priceDA: 1500,  dataGB: 50,   voiceMinutes: -1,  smsCount: 0,  validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','1500 DA national credit','10 min international (20 destinations)','Monthly plan','Unused data/credit rolls over','5G compatible']), sourceUrl: BASE_OO+'ooredoo-pop' },
  { op: OOREDOO_ID, name: 'Ooredoo POP 2000',           type: 'POSTPAID',  priceDA: 2000,  dataGB: 80,   voiceMinutes: -1,  smsCount: 50, validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited calls (all networks)','ANAZIK music subscription','ANAFLIX film/series subscription','Free Facebook','Monthly plan','5G compatible']), sourceUrl: BASE_OO+'ooredoo-pop' },
  { op: OOREDOO_ID, name: 'Ooredoo POP 2500',           type: 'POSTPAID',  priceDA: 2500,  dataGB: 120,  voiceMinutes: -1,  smsCount: 0,  validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','2500 DA national credit','30 min international (20 destinations)','Monthly plan','5G compatible']), sourceUrl: BASE_OO+'ooredoo-pop' },
  { op: OOREDOO_ID, name: 'Ooredoo POP 4000',           type: 'POSTPAID',  priceDA: 4000,  dataGB: 300,  voiceMinutes: -1,  smsCount: 0,  validityDays: 30, network: '4G/5G',  features: JSON.stringify(['Unlimited Ooredoo calls','4000 DA national credit','50 min international (20 destinations)','Monthly plan','5G compatible']), sourceUrl: BASE_OO+'ooredoo-pop' },

  // Forfait Internet data-only
  { op: OOREDOO_ID, name: 'Ooredoo Forfait Internet 100 DA',  type: 'DATA_ONLY', priceDA: 100,  dataGB: 0.7, voiceMinutes: 0, smsCount: 0, validityDays: 1,  network: '4G',    features: JSON.stringify(['Unlimited YouTube']),                    sourceUrl: 'https://www.ooredoo.dz/particuliers/internet/forfaits-internet' },
  { op: OOREDOO_ID, name: 'Ooredoo Forfait Internet 300 DA', type: 'DATA_ONLY', priceDA: 300,  dataGB: 3,   voiceMinutes: 0, smsCount: 0, validityDays: 3,  network: '4G',    features: JSON.stringify(['Unlimited YouTube']),                    sourceUrl: 'https://www.ooredoo.dz/particuliers/internet/forfaits-internet' },
  { op: OOREDOO_ID, name: 'Ooredoo Forfait Internet 500 DA', type: 'DATA_ONLY', priceDA: 500,  dataGB: 6,   voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',    features: JSON.stringify([]),                                       sourceUrl: 'https://www.ooredoo.dz/particuliers/internet/forfaits-internet' },
  { op: OOREDOO_ID, name: 'Ooredoo Forfait Internet 1000 DA',type: 'DATA_ONLY', priceDA: 1000, dataGB: 15,  voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',    features: JSON.stringify(['5 GB YouTube bonus allocation']),       sourceUrl: 'https://www.ooredoo.dz/particuliers/internet/forfaits-internet' },
  { op: OOREDOO_ID, name: 'Ooredoo Forfait Internet 1500 DA',type: 'DATA_ONLY', priceDA: 1500, dataGB: 40,  voiceMinutes: 0, smsCount: 0, validityDays: 30, network: '4G',    features: JSON.stringify(['Unlimited YouTube']),                    sourceUrl: 'https://www.ooredoo.dz/particuliers/internet/forfaits-internet' },

  // ─── MOBILIS ─────────────────────────────────────────────────────────────

  // Revolution Prepaid
  { op: MOBILIS_ID, name: 'Mobilis Revolution Prepaid 500',    type: 'PREPAID',  priceDA: 500,  dataGB: 8,   voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Unified MU credit system','MobiSpace app management','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Prepaid 1000',   type: 'PREPAID',  priceDA: 1000, dataGB: 18,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Unified MU credit','200 MU renewal bonus','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Prepaid 1500',   type: 'PREPAID',  priceDA: 1500, dataGB: 30,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Unified MU credit','200 MU renewal bonus','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Prepaid 2000',   type: 'PREPAID',  priceDA: 2000, dataGB: 45,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Unified MU credit','200 MU renewal bonus','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_prepaid' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Prepaid 3000',   type: 'PREPAID',  priceDA: 3000, dataGB: 70,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS','Unified MU credit','200 MU renewal bonus','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_prepaid' },

  // Revolution Control
  { op: MOBILIS_ID, name: 'Mobilis Revolution Control 1000',   type: 'PREPAID',  priceDA: 1000, dataGB: 18,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Control plan','250 MU renewal bonus','KeepOn MU reserve','Restore service','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_control' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Control 2000',   type: 'PREPAID',  priceDA: 2000, dataGB: 45,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Control plan','250 MU renewal bonus','KeepOn MU reserve','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_control' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Control 3000',   type: 'PREPAID',  priceDA: 3000, dataGB: 70,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS','Control plan','250 MU renewal bonus','KeepOn MU reserve','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_control' },

  // Revolution Postpaid
  { op: MOBILIS_ID, name: 'Mobilis Revolution Postpaid 1500',  type: 'POSTPAID', priceDA: 1500, dataGB: 30,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Monthly plan','300 MU upgrade bonus','KeepOn MU reserve','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Postpaid 2000',  type: 'POSTPAID', priceDA: 2000, dataGB: 50,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited Mobilis calls','Unlimited Mobilis SMS','Monthly plan','300 MU upgrade bonus','KeepOn MU reserve','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Postpaid 3000',  type: 'POSTPAID', priceDA: 3000, dataGB: 80,  voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS','Monthly plan','300 MU upgrade bonus','KeepOn MU reserve','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_postpaid' },
  { op: MOBILIS_ID, name: 'Mobilis Revolution Postpaid 4000',  type: 'POSTPAID', priceDA: 4000, dataGB: 120, voiceMinutes: -1, smsCount: -1, validityDays: 30, network: '4G/5G', features: JSON.stringify(['Unlimited calls (all networks)','Unlimited SMS','Monthly plan','300 MU upgrade bonus','KeepOn MU reserve','Data rollover','5G compatible']), sourceUrl: 'https://mobilis.dz/revolution_postpaid' },

  // MobiNet Plus data-only
  { op: MOBILIS_ID, name: 'MobiNet Plus Monthly',              type: 'DATA_ONLY', priceDA: 1500, dataGB: 60,  voiceMinutes: 0, smsCount: 0, validityDays: 30,  network: '4G', features: JSON.stringify(['Unlimited YouTube after quota','Modem SIM compatible','Share up to 32 users','Boost 30 GB add-on available (500 DA)']), sourceUrl: 'https://mobilis.dz/mobinet_plus' },
  { op: MOBILIS_ID, name: 'MobiNet Plus 3 Months',             type: 'DATA_ONLY', priceDA: 3500, dataGB: 200, voiceMinutes: 0, smsCount: 0, validityDays: 90,  network: '4G', features: JSON.stringify(['Unlimited YouTube after quota','Modem SIM compatible','Share up to 32 users']), sourceUrl: 'https://mobilis.dz/mobinet_plus' },
  { op: MOBILIS_ID, name: 'MobiNet Plus 6 Months',             type: 'DATA_ONLY', priceDA: 6500, dataGB: 400, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G', features: JSON.stringify(['Unlimited YouTube after quota','Modem SIM compatible','Share up to 32 users','Boost 30 GB add-on available']), sourceUrl: 'https://mobilis.dz/mobinet_plus' },

  // MobiNet data-only
  { op: MOBILIS_ID, name: 'MobiNet Monthly',                   type: 'DATA_ONLY', priceDA: 1500, dataGB: 60,  voiceMinutes: 0, smsCount: 0, validityDays: 30,  network: '4G', features: JSON.stringify(['Unlimited YouTube after quota','Modem SIM compatible','Share up to 16 users']), sourceUrl: 'https://mobilis.dz/mobinet' },
  { op: MOBILIS_ID, name: 'MobiNet 3 Months',                  type: 'DATA_ONLY', priceDA: 3500, dataGB: 200, voiceMinutes: 0, smsCount: 0, validityDays: 90,  network: '4G', features: JSON.stringify(['Unlimited YouTube after quota','Modem SIM compatible']), sourceUrl: 'https://mobilis.dz/mobinet' },
  { op: MOBILIS_ID, name: 'MobiNet 6 Months',                  type: 'DATA_ONLY', priceDA: 6500, dataGB: 400, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G', features: JSON.stringify(['Unlimited YouTube after quota','Modem SIM compatible','Boost 30 GB add-on (500 DA)']), sourceUrl: 'https://mobilis.dz/mobinet' },

  // Navigui Internet data-only
  { op: MOBILIS_ID, name: 'Navigui Internet Monthly 1000 DA',  type: 'DATA_ONLY', priceDA: 1000,  dataGB: 10,  voiceMinutes: 0, smsCount: 0, validityDays: 30,  network: '4G', features: JSON.stringify(['Data rollover (6-month window)','Free WhatsApp & Facebook','Purchase via #600*']), sourceUrl: 'https://mobilis.dz/naviguiinternet' },
  { op: MOBILIS_ID, name: 'Navigui Internet Monthly 2000 DA',  type: 'DATA_ONLY', priceDA: 2000,  dataGB: 25,  voiceMinutes: 0, smsCount: 0, validityDays: 30,  network: '4G', features: JSON.stringify(['Data rollover (6-month window)']), sourceUrl: 'https://mobilis.dz/naviguiinternet' },
  { op: MOBILIS_ID, name: 'Navigui Internet 3 Months',         type: 'DATA_ONLY', priceDA: 6000,  dataGB: 80,  voiceMinutes: 0, smsCount: 0, validityDays: 90,  network: '4G', features: JSON.stringify(['Data rollover']), sourceUrl: 'https://mobilis.dz/naviguiinternet' },
  { op: MOBILIS_ID, name: 'Navigui Internet 6 Months',         type: 'DATA_ONLY', priceDA: 15000, dataGB: 300, voiceMinutes: 0, smsCount: 0, validityDays: 180, network: '4G', features: JSON.stringify(['Data rollover','Balance check via #222*']), sourceUrl: 'https://mobilis.dz/naviguiinternet' },

  // Pass Internet add-on passes
  { op: MOBILIS_ID, name: 'Mobilis Pass Internet 30 DA',       type: 'DATA_ONLY', priceDA: 30,   dataGB: 0.3, voiceMinutes: 0, smsCount: 0, validityDays: 1,   network: '4G', features: JSON.stringify(['Free WhatsApp & Facebook','Stackable passes','Purchase via *600#']), sourceUrl: 'https://mobilis.dz/passinternet' },
  { op: MOBILIS_ID, name: 'Mobilis Pass Internet 100 DA',      type: 'DATA_ONLY', priceDA: 100,  dataGB: 1,   voiceMinutes: 0, smsCount: 0, validityDays: 1,   network: '4G', features: JSON.stringify(['Stackable passes','Purchase via *600#']), sourceUrl: 'https://mobilis.dz/passinternet' },
  { op: MOBILIS_ID, name: 'Mobilis Pass Internet 500 DA',      type: 'DATA_ONLY', priceDA: 500,  dataGB: 4,   voiceMinutes: 0, smsCount: 0, validityDays: 7,   network: '4G', features: JSON.stringify(['Stackable passes']), sourceUrl: 'https://mobilis.dz/passinternet' },
  { op: MOBILIS_ID, name: 'Mobilis Pass Internet 1000 DA',     type: 'DATA_ONLY', priceDA: 1000, dataGB: 10,  voiceMinutes: 0, smsCount: 0, validityDays: 30,  network: '4G', features: JSON.stringify(['Stackable passes']), sourceUrl: 'https://mobilis.dz/passinternet' },
  { op: MOBILIS_ID, name: 'Mobilis Pass Internet 2000 DA',     type: 'DATA_ONLY', priceDA: 2000, dataGB: 25,  voiceMinutes: 0, smsCount: 0, validityDays: 30,  network: '4G', features: JSON.stringify(['Stackable passes','Consumed shortest-expiry first']), sourceUrl: 'https://mobilis.dz/passinternet' },
]

// ─── Upsert all offers ────────────────────────────────────────────────────────

const checkStmt    = db.prepare('SELECT id FROM Offer WHERE operatorId = ? AND slug = ?')
const insertStmt   = db.prepare(`INSERT INTO Offer (id,operatorId,name,slug,type,priceDA,dataGB,voiceMinutes,smsCount,validityDays,network,features,isActive,isFeatured,sourceUrl,scrapedAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,0,?,?,?,?)`)
const updateStmt   = db.prepare(`UPDATE Offer SET name=?,type=?,priceDA=?,dataGB=?,voiceMinutes=?,smsCount=?,validityDays=?,network=?,features=?,isActive=1,sourceUrl=?,scrapedAt=?,updatedAt=? WHERE operatorId=? AND slug=?`)
const deactivateStmt = db.prepare('UPDATE Offer SET isActive=0,updatedAt=? WHERE operatorId=? AND slug NOT IN (' + '?,'.repeat(100).slice(0,-1) + ') AND isActive=1')

let added = 0, updated = 0
const seenSlugs = { [DJEZZY_ID]: [], [OOREDOO_ID]: [], [MOBILIS_ID]: [] }

const upsert = db.transaction(() => {
  for (const o of offers) {
    const slug = slugify(o.name)
    if (!seenSlugs[o.op]) seenSlugs[o.op] = []
    seenSlugs[o.op].push(slug)

    const existing = checkStmt.get(o.op, slug)
    if (existing) {
      updateStmt.run(o.name, o.type, o.priceDA, o.dataGB, o.voiceMinutes, o.smsCount, o.validityDays, o.network, o.features, o.sourceUrl, now, now, o.op, slug)
      updated++
    } else {
      insertStmt.run(cuid(), o.op, o.name, slug, o.type, o.priceDA, o.dataGB, o.voiceMinutes, o.smsCount, o.validityDays, o.network, o.features, o.sourceUrl, now, now, now)
      added++
    }
  }
})

upsert()

// Deactivate old offers not in our verified set, per operator
let deactivated = 0
for (const [opId, slugs] of Object.entries(seenSlugs)) {
  if (!slugs.length) continue
  // Build parameterised query for the exact slug count
  const placeholders = slugs.map(() => '?').join(',')
  const deact = db.prepare(`UPDATE Offer SET isActive=0,updatedAt=? WHERE operatorId=? AND slug NOT IN (${placeholders}) AND isActive=1`)
  const result = deact.run(now, opId, ...slugs)
  deactivated += result.changes
}

// Final count
const byOp = db.prepare(`
  SELECT op.name, COUNT(f.id) as n
  FROM Operator op
  LEFT JOIN Offer f ON f.operatorId = op.id AND f.isActive = 1
  GROUP BY op.id
`).all()

console.log('\n✅ Seed complete')
console.log(`   Added:       ${added}`)
console.log(`   Updated:     ${updated}`)
console.log(`   Deactivated: ${deactivated}`)
console.log('\nActive offers by operator:')
for (const row of byOp) console.log(`   ${row.name}: ${row.n}`)
const total = db.prepare('SELECT COUNT(*) as n FROM Offer WHERE isActive=1').get()
console.log(`   TOTAL: ${total.n}`)

db.close()
