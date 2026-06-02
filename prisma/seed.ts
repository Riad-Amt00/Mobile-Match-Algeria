import 'dotenv/config'
import { PrismaClient, OfferType, Role } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

function resolveDbUrl() {
  return process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db'
}

const adapter = new PrismaBetterSqlite3({ url: resolveDbUrl() })
const db = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // ── Admin user ─────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123456', 12)
  await db.user.upsert({
    where: { email: 'admin@mobilematch.dz' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@mobilematch.dz',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  })
  console.log('✅ Admin user created: admin@mobilematch.dz / admin123456')

  // ── Demo user ──────────────────────────────────────────────────────
  const userHash = await bcrypt.hash('user123456', 12)
  await db.user.upsert({
    where: { email: 'demo@mobilematch.dz' },
    update: {},
    create: {
      name: 'Ahmed Bensalem',
      email: 'demo@mobilematch.dz',
      passwordHash: userHash,
      role: Role.USER,
    },
  })
  console.log('✅ Demo user created: demo@mobilematch.dz / user123456')

  // ── Operators ──────────────────────────────────────────────────────
  const djezzy = await db.operator.upsert({
    where: { slug: 'djezzy' },
    update: {},
    create: {
      name: 'Djezzy',
      slug: 'djezzy',
      websiteUrl: 'https://www.djezzy5g.dz/',
      primaryColor: '#E30613',
    },
  })

  const ooredoo = await db.operator.upsert({
    where: { slug: 'ooredoo' },
    update: {},
    create: {
      name: 'Ooredoo',
      slug: 'ooredoo',
      websiteUrl: 'https://www.ooredoo.dz/',
      primaryColor: '#E20074',
    },
  })

  const mobilis = await db.operator.upsert({
    where: { slug: 'mobilis' },
    update: {},
    create: {
      name: 'Mobilis',
      slug: 'mobilis',
      websiteUrl: 'https://mobilis.dz/',
      primaryColor: '#00A651',
    },
  })
  console.log('✅ Operators: Djezzy, Ooredoo, Mobilis')

  // ── Helper ─────────────────────────────────────────────────────────
  function slugify(s: string) {
    return s.toLowerCase()
      .replace(/[àáâ]/g,'a').replace(/[éèê]/g,'e').replace(/[ùû]/g,'u')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
  }

  async function upsertOffer(data: {
    operatorId: string; name: string; type: OfferType; priceDA: number
    dataGB: number; voiceMinutes: number; smsCount: number; validityDays: number
    network: string; features: string[]; isFeatured?: boolean; sourceUrl: string
  }) {
    const slug = slugify(data.name)
    await db.offer.upsert({
      where: { operatorId_slug: { operatorId: data.operatorId, slug } },
      update: { ...data, features: JSON.stringify(data.features), slug, scrapedAt: new Date() },
      create: { ...data, features: JSON.stringify(data.features), slug, scrapedAt: new Date(), isActive: true },
    })
  }

  // ══════════════════════════════════════════════════════════════════
  // DJEZZY OFFERS
  // ══════════════════════════════════════════════════════════════════
  const djezzyOffers = [
    // ── Prépayé ZID ──
    { name:'ZID 50',    type:OfferType.PREPAID, priceDA:50,   dataGB:0.3, voiceMinutes:20,  smsCount:10,  validityDays:1,  network:'4G',    isFeatured:false, features:['Appels Djezzy illimités'] },
    { name:'ZID 100',   type:OfferType.PREPAID, priceDA:100,  dataGB:1,   voiceMinutes:30,  smsCount:20,  validityDays:2,  network:'4G',    isFeatured:false, features:['Appels Djezzy illimités'] },
    { name:'ZID 200',   type:OfferType.PREPAID, priceDA:200,  dataGB:3,   voiceMinutes:60,  smsCount:50,  validityDays:7,  network:'4G',    isFeatured:false, features:['Appels Djezzy illimités','Facebook offert'] },
    { name:'ZID 500',   type:OfferType.PREPAID, priceDA:500,  dataGB:10,  voiceMinutes:150, smsCount:100, validityDays:30, network:'4G',    isFeatured:true,  features:['Appels Djezzy illimités','Facebook offert','5 GB bonus nuit'] },
    { name:'ZID 1000',  type:OfferType.PREPAID, priceDA:1000, dataGB:25,  voiceMinutes:300, smsCount:200, validityDays:30, network:'4G',    isFeatured:true,  features:['Appels Djezzy illimités','Réseaux sociaux offerts','10 GB bonus nuit'] },
    { name:'ZID 1500',  type:OfferType.PREPAID, priceDA:1500, dataGB:40,  voiceMinutes:-1,  smsCount:300, validityDays:30, network:'4G',    isFeatured:false, features:['Appels illimités toutes réseaux','Réseaux sociaux offerts','15 GB bonus nuit'] },
    { name:'ZID 2000',  type:OfferType.PREPAID, priceDA:2000, dataGB:60,  voiceMinutes:-1,  smsCount:-1,  validityDays:30, network:'4G/5G', isFeatured:true,  features:['Appels illimités toutes réseaux','SMS illimités','Réseaux sociaux offerts','20 GB bonus nuit'] },
    { name:'ZID 3000',  type:OfferType.PREPAID, priceDA:3000, dataGB:100, voiceMinutes:-1,  smsCount:-1,  validityDays:30, network:'4G/5G', isFeatured:false, features:['Appels illimités toutes réseaux','SMS illimités','Réseaux sociaux offerts','30 GB bonus nuit','5G prioritaire'] },
    // ── Postpayé ──
    { name:'Djezzy Pro 1500', type:OfferType.POSTPAID, priceDA:1500, dataGB:30,  voiceMinutes:200, smsCount:100, validityDays:30, network:'4G',    isFeatured:false, features:['Facturation mensuelle','Appels Djezzy illimités'] },
    { name:'Djezzy Pro 2500', type:OfferType.POSTPAID, priceDA:2500, dataGB:80,  voiceMinutes:-1,  smsCount:200, validityDays:30, network:'4G/5G', isFeatured:true,  features:['Facturation mensuelle','Appels illimités toutes réseaux','Roaming disponible'] },
    { name:'Djezzy Pro 4000', type:OfferType.POSTPAID, priceDA:4000, dataGB:150, voiceMinutes:-1,  smsCount:-1,  validityDays:30, network:'4G/5G', isFeatured:false, features:['Facturation mensuelle','Appels illimités toutes réseaux','SMS illimités','Roaming international','5G prioritaire'] },
    { name:'Djezzy Elite 6000', type:OfferType.POSTPAID, priceDA:6000, dataGB:300, voiceMinutes:-1, smsCount:-1, validityDays:30, network:'4G/5G', isFeatured:false, features:['Facturation mensuelle','Appels illimités toutes réseaux','SMS illimités','Roaming premium','5G prioritaire','2 SIM'] },
    // ── Data Only ──
    { name:'Djezzy Data 500',  type:OfferType.DATA_ONLY, priceDA:500,  dataGB:15,  voiceMinutes:0, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Data uniquement','Compatible tablette/routeur'] },
    { name:'Djezzy Data 1000', type:OfferType.DATA_ONLY, priceDA:1000, dataGB:35,  voiceMinutes:0, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Data uniquement','Compatible tablette/routeur','Bonus nuit 10 GB'] },
    { name:'Djezzy Data 2000', type:OfferType.DATA_ONLY, priceDA:2000, dataGB:80,  voiceMinutes:0, smsCount:0, validityDays:30, network:'4G/5G', isFeatured:false, features:['Data uniquement','Compatible box 4G/5G','Bonus nuit 25 GB'] },
  ]

  for (const o of djezzyOffers) {
    await upsertOffer({ ...o, operatorId: djezzy.id, sourceUrl: 'https://www.djezzy5g.dz/#Offer' })
  }
  console.log(`✅ Djezzy: ${djezzyOffers.length} offres insérées`)

  // ══════════════════════════════════════════════════════════════════
  // OOREDOO OFFERS
  // ══════════════════════════════════════════════════════════════════
  const ooredooOffers = [
    // ── Prépayé Dima ──
    { name:'Dima 50',    type:OfferType.PREPAID, priceDA:50,   dataGB:0.2, voiceMinutes:30,  smsCount:0,  validityDays:1,  network:'4G',    isFeatured:false, features:['Appels Ooredoo illimités'] },
    { name:'Dima 100',   type:OfferType.PREPAID, priceDA:100,  dataGB:0.5, voiceMinutes:-1,  smsCount:0,  validityDays:1,  network:'4G',    isFeatured:false, features:['Appels Ooredoo illimités','Facebook/Messenger offert'] },
    { name:'Dima 200',   type:OfferType.PREPAID, priceDA:200,  dataGB:1.5, voiceMinutes:-1,  smsCount:0,  validityDays:1,  network:'4G',    isFeatured:false, features:['Appels Ooredoo illimités','Crédit 600 DA'] },
    { name:'Dima 500',   type:OfferType.PREPAID, priceDA:500,  dataGB:5,   voiceMinutes:-1,  smsCount:0,  validityDays:15, network:'4G',    isFeatured:false, features:['Appels Ooredoo illimités','Facebook offert'] },
    { name:'Dima 1000',  type:OfferType.PREPAID, priceDA:1000, dataGB:15,  voiceMinutes:100, smsCount:100,validityDays:30, network:'4G',    isFeatured:false, features:['Appels Ooredoo illimités','Facebook offert'] },
    { name:'Dima 1500',  type:OfferType.PREPAID, priceDA:1500, dataGB:30,  voiceMinutes:150, smsCount:150,validityDays:30, network:'4G',    isFeatured:true,  features:['Appels Ooredoo illimités','Anaflix inclus','Facebook offert'] },
    { name:'Dima 2000',  type:OfferType.PREPAID, priceDA:2000, dataGB:50,  voiceMinutes:300, smsCount:200,validityDays:30, network:'4G',    isFeatured:false, features:['Appels Ooredoo illimités','Anaflix + Anazik inclus','Facebook offert'] },
    { name:'Dima 2500',  type:OfferType.PREPAID, priceDA:2500, dataGB:100, voiceMinutes:-1,  smsCount:-1, validityDays:30, network:'4G/5G', isFeatured:true,  features:['Appels illimités toutes réseaux','SMS illimités Ooredoo','100 SMS autres','Shahid inclus','Anaflix inclus'] },
    { name:'Dima 4000',  type:OfferType.PREPAID, priceDA:4000, dataGB:200, voiceMinutes:-1,  smsCount:-1, validityDays:30, network:'4G/5G', isFeatured:false, features:['Appels illimités toutes réseaux','SMS illimités','200 SMS autres réseaux','Streaming premium'] },
    // ── Prépayé Scholar (Étudiant) ──
    { name:'Scholar 500',  type:OfferType.PREPAID, priceDA:500,  dataGB:7,  voiceMinutes:-1, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Forfait étudiant','Appels Ooredoo illimités','2 GB bonus'] },
    { name:'Scholar 1000', type:OfferType.PREPAID, priceDA:1000, dataGB:20, voiceMinutes:-1, smsCount:0, validityDays:30, network:'4G',    isFeatured:true,  features:['Forfait étudiant','Appels Ooredoo illimités','5 GB bonus'] },
    { name:'Scholar 2000', type:OfferType.PREPAID, priceDA:2000, dataGB:80, voiceMinutes:-1, smsCount:0, validityDays:30, network:'4G/5G', isFeatured:false, features:['Forfait étudiant','Appels Ooredoo illimités','10 GB bonus'] },
    // ── Prépayé N'YOOZ ──
    { name:"N'YOOZ 300",  type:OfferType.PREPAID, priceDA:300,  dataGB:3,  voiceMinutes:30,  smsCount:30, validityDays:7,  network:'4G', isFeatured:false, features:["Personnalisable via l'app N'YOOZ",'Facebook/Messenger offert'] },
    { name:"N'YOOZ 1000", type:OfferType.PREPAID, priceDA:1000, dataGB:15, voiceMinutes:100, smsCount:0,  validityDays:30, network:'4G', isFeatured:false, features:["Personnalisable via l'app N'YOOZ",'Appels Ooredoo illimités'] },
    { name:"N'YOOZ 2000", type:OfferType.PREPAID, priceDA:2000, dataGB:60, voiceMinutes:300, smsCount:0,  validityDays:30, network:'4G', isFeatured:false, features:["Personnalisable via l'app N'YOOZ",'Appels Ooredoo illimités','Facebook/Messenger offert'] },
    // ── Postpayé Dima+ ──
    { name:'Dima+ 1500', type:OfferType.POSTPAID, priceDA:1500, dataGB:30, voiceMinutes:150, smsCount:150, validityDays:30, network:'4G',    isFeatured:false, features:['Facturation mensuelle','Appels Ooredoo illimités','Anaflix inclus'] },
    { name:'Dima+ 2000', type:OfferType.POSTPAID, priceDA:2000, dataGB:50, voiceMinutes:300, smsCount:200, validityDays:30, network:'4G',    isFeatured:true,  features:['Facturation mensuelle','Appels Ooredoo illimités','Anaflix + Anazik inclus'] },
    { name:'Dima+ 2500', type:OfferType.POSTPAID, priceDA:2500, dataGB:100,voiceMinutes:-1,  smsCount:100, validityDays:30, network:'4G/5G', isFeatured:false, features:['Facturation mensuelle','Appels illimités toutes réseaux','100 SMS autres réseaux'] },
    // ── Postpayé La Switch ──
    { name:'La Switch 1500', type:OfferType.POSTPAID, priceDA:1500, dataGB:50,  voiceMinutes:-1, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Appels Ooredoo illimités','Crédit 1500 DA','10 min international'] },
    { name:'La Switch 2500', type:OfferType.POSTPAID, priceDA:2500, dataGB:120, voiceMinutes:-1, smsCount:0, validityDays:30, network:'4G/5G', isFeatured:false, features:['Appels Ooredoo illimités','Crédit 2500 DA','30 min international'] },
    { name:'La Switch 4000', type:OfferType.POSTPAID, priceDA:4000, dataGB:300, voiceMinutes:-1, smsCount:0, validityDays:30, network:'4G/5G', isFeatured:false, features:['Appels Ooredoo illimités','Crédit 4000 DA','50 min international','Roaming disponible'] },
    // ── Data Only ──
    { name:'Internet Ooredoo 1500', type:OfferType.DATA_ONLY, priceDA:1500, dataGB:50,  voiceMinutes:0, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Data uniquement','Compatible routeur 4G'] },
    { name:'Internet Ooredoo 2500', type:OfferType.DATA_ONLY, priceDA:2500, dataGB:120, voiceMinutes:0, smsCount:0, validityDays:30, network:'4G/5G', isFeatured:false, features:['Data uniquement','Compatible routeur 4G/5G'] },
    { name:'Sahla Box 4500',        type:OfferType.DATA_ONLY, priceDA:4500, dataGB:50,  voiceMinutes:0, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Box Internet maison','Installation incluse'] },
    { name:'Sahla Box 6990',        type:OfferType.DATA_ONLY, priceDA:6990, dataGB:100, voiceMinutes:0, smsCount:0, validityDays:30, network:'4G/5G', isFeatured:false, features:['Box Internet maison','Installation incluse','Débit prioritaire'] },
  ]

  for (const o of ooredooOffers) {
    await upsertOffer({ ...o, operatorId: ooredoo.id, sourceUrl: 'https://www.ooredoo.dz/fr/' })
  }
  console.log(`✅ Ooredoo: ${ooredooOffers.length} offres insérées`)

  // ══════════════════════════════════════════════════════════════════
  // MOBILIS OFFERS
  // ══════════════════════════════════════════════════════════════════
  const mobilisOffers = [
    // ── Prépayé Tawali (court terme) ──
    { name:'Tawali 50',  type:OfferType.PREPAID, priceDA:50,  dataGB:0.3, voiceMinutes:20,  smsCount:10,  validityDays:1, network:'4G',    isFeatured:false, features:['Appels Mobilis illimités'] },
    { name:'Tawali 100', type:OfferType.PREPAID, priceDA:100, dataGB:0.8, voiceMinutes:40,  smsCount:20,  validityDays:1, network:'4G',    isFeatured:false, features:['Appels Mobilis illimités','Crédit 100 DA'] },
    { name:'Tawali 200', type:OfferType.PREPAID, priceDA:200, dataGB:2,   voiceMinutes:80,  smsCount:30,  validityDays:7, network:'4G',    isFeatured:false, features:['Appels Mobilis illimités','Facebook offert'] },
    // ── Prépayé Idoom (mensuel) ──
    { name:'Idoom 500',  type:OfferType.PREPAID, priceDA:500,  dataGB:8,   voiceMinutes:100, smsCount:50,  validityDays:30, network:'4G',    isFeatured:false, features:['Appels Mobilis illimités','Bonus data nuit 5 GB'] },
    { name:'Idoom 1000', type:OfferType.PREPAID, priceDA:1000, dataGB:20,  voiceMinutes:200, smsCount:100, validityDays:30, network:'4G',    isFeatured:true,  features:['Appels Mobilis illimités','Réseaux sociaux offerts','Bonus nuit 10 GB'] },
    { name:'Idoom 1500', type:OfferType.PREPAID, priceDA:1500, dataGB:35,  voiceMinutes:-1,  smsCount:150, validityDays:30, network:'4G',    isFeatured:false, features:['Appels illimités toutes réseaux','Réseaux sociaux offerts','Bonus nuit 15 GB'] },
    { name:'Idoom 2000', type:OfferType.PREPAID, priceDA:2000, dataGB:60,  voiceMinutes:-1,  smsCount:200, validityDays:30, network:'4G',    isFeatured:true,  features:['Appels illimités toutes réseaux','Réseaux sociaux offerts','Bonus nuit 20 GB','SMS illimités Mobilis'] },
    { name:'Idoom 2500', type:OfferType.PREPAID, priceDA:2500, dataGB:100, voiceMinutes:-1,  smsCount:-1,  validityDays:30, network:'4G/5G', isFeatured:false, features:['Appels illimités toutes réseaux','SMS illimités','Réseaux sociaux offerts','Bonus nuit 30 GB'] },
    { name:'Idoom 4000', type:OfferType.PREPAID, priceDA:4000, dataGB:200, voiceMinutes:-1,  smsCount:-1,  validityDays:30, network:'4G/5G', isFeatured:false, features:['Appels illimités toutes réseaux','SMS illimités','Streaming HD','Bonus nuit 50 GB','5G prioritaire'] },
    // ── Postpayé Pro ──
    { name:'Mobilis Pro 1500',     type:OfferType.POSTPAID, priceDA:1500, dataGB:25,  voiceMinutes:200, smsCount:100, validityDays:30, network:'4G',    isFeatured:false, features:['Facturation mensuelle','Appels Mobilis illimités','Support prioritaire'] },
    { name:'Mobilis Pro 2500',     type:OfferType.POSTPAID, priceDA:2500, dataGB:70,  voiceMinutes:-1,  smsCount:200, validityDays:30, network:'4G',    isFeatured:true,  features:['Facturation mensuelle','Appels illimités toutes réseaux','Roaming Afrique'] },
    { name:'Mobilis Pro Elite 4000', type:OfferType.POSTPAID, priceDA:4000, dataGB:150,voiceMinutes:-1, smsCount:-1,  validityDays:30, network:'4G/5G', isFeatured:false, features:['Facturation mensuelle','Appels illimités toutes réseaux','SMS illimités','Roaming international','5G disponible'] },
    { name:'Mobilis Pro Elite 6000', type:OfferType.POSTPAID, priceDA:6000, dataGB:300,voiceMinutes:-1, smsCount:-1,  validityDays:30, network:'4G/5G', isFeatured:false, features:['Facturation mensuelle','Appels illimités toutes réseaux','SMS illimités','Roaming premium','5G','SIM double réseau'] },
    // ── Data Only Idoom 4G ──
    { name:'Idoom 4G 500',  type:OfferType.DATA_ONLY, priceDA:500,  dataGB:10, voiceMinutes:0, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Data uniquement','Compatible box 4G','Bonus nuit 5 GB'] },
    { name:'Idoom 4G 1000', type:OfferType.DATA_ONLY, priceDA:1000, dataGB:30, voiceMinutes:0, smsCount:0, validityDays:30, network:'4G',    isFeatured:false, features:['Data uniquement','Compatible box 4G','Bonus nuit 15 GB'] },
    { name:'Idoom 4G 2000', type:OfferType.DATA_ONLY, priceDA:2000, dataGB:80, voiceMinutes:0, smsCount:0, validityDays:30, network:'4G',    isFeatured:true,  features:['Data uniquement','Compatible box 4G','Bonus nuit 40 GB'] },
    { name:'Idoom 4G 3500', type:OfferType.DATA_ONLY, priceDA:3500, dataGB:200,voiceMinutes:0, smsCount:0, validityDays:30, network:'4G/5G', isFeatured:false, features:['Internet domestique','Compatible box 4G/5G','Débit prioritaire'] },
  ]

  for (const o of mobilisOffers) {
    await upsertOffer({ ...o, operatorId: mobilis.id, sourceUrl: 'https://mobilis.dz/' })
  }
  console.log(`✅ Mobilis: ${mobilisOffers.length} offres insérées`)

  const total = djezzyOffers.length + ooredooOffers.length + mobilisOffers.length
  console.log(`\n🎉 Seed terminé! ${total} offres insérées au total.`)
  console.log(`\n📋 Comptes de test:`)
  console.log(`   Admin: admin@mobilematch.dz / admin123456`)
  console.log(`   User:  demo@mobilematch.dz  / user123456`)
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
