/**
 * Translate French feature strings stored in the SQLite DB to English.
 * Uses better-sqlite3 directly (same driver as app).
 * Run: node scripts/translate-db-features.cjs
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const db = new Database(DB_PATH);

const TRANSLATIONS = {
  // Djezzy
  "Appels Djezzy illimités": "Unlimited Djezzy calls",
  "Appels Djezzy illimit\u00e9s": "Unlimited Djezzy calls",
  "Appels illimités Djezzy": "Unlimited Djezzy calls",
  "Appels illimités toutes réseaux": "Unlimited calls all operators",
  "Appels illimit\u00e9s toutes r\u00e9seaux": "Unlimited calls all operators",
  "Appels illimités tous réseaux": "Unlimited calls all operators",
  "Appels illimités": "Unlimited calls",
  "Appels illimit\u00e9s": "Unlimited calls",
  "SMS illimités Djezzy": "Unlimited Djezzy SMS",
  "SMS illimit\u00e9s Djezzy": "Unlimited Djezzy SMS",
  "SMS illimités": "Unlimited SMS",
  "SMS illimit\u00e9s": "Unlimited SMS",
  "Data renouvelable": "Renewable data",
  "Data de nuit": "Night data bonus",
  "Data bonus nuit": "Night data bonus",
  "Bonus data nuit": "Night data bonus",
  "Valable la nuit": "Valid at night",
  "Partage de connexion": "Hotspot sharing",
  "Partage connexion": "Hotspot sharing",
  "Hotspot inclus": "Hotspot included",
  "5G inclus": "5G included",
  "5G disponible": "5G available",
  "Réseau 5G": "5G network",
  "R\u00e9seau 5G": "5G network",
  "Roaming disponible": "Roaming available",
  "Roaming inclus": "Roaming included",
  "Roaming international": "International roaming",

  // Mobilis
  "Appels Mobilis illimités": "Unlimited Mobilis calls",
  "Appels Mobilis illimit\u00e9s": "Unlimited Mobilis calls",
  "SMS illimités Mobilis": "Unlimited Mobilis SMS",
  "SMS illimit\u00e9s Mobilis": "Unlimited Mobilis SMS",
  "Internet illimité": "Unlimited internet",
  "Internet illimit\u00e9": "Unlimited internet",
  "4G disponible": "4G available",
  "4G inclus": "4G included",
  "Réseau 4G": "4G network",
  "R\u00e9seau 4G": "4G network",
  "Data illimitée": "Unlimited data",
  "Data illimit\u00e9e": "Unlimited data",
  "Tous réseaux": "All operators",
  "Tous r\u00e9seaux": "All operators",

  // Ooredoo
  "Appels Ooredoo illimités": "Unlimited Ooredoo calls",
  "Appels Ooredoo illimit\u00e9s": "Unlimited Ooredoo calls",
  "Appels illimités Ooredoo": "Unlimited Ooredoo calls",
  "SMS illimités Ooredoo": "Unlimited Ooredoo SMS",
  "SMS illimit\u00e9s Ooredoo": "Unlimited Ooredoo SMS",
  "Anaflix inclus": "Anaflix included",
  "Anazik inclus": "Anazik included",
  "Anaflix + Anazik inclus": "Anaflix + Anazik included",
  "Shahid inclus": "Shahid included",
  "Facebook offert": "Free Facebook",
  "Facebook/Messenger offert": "Free Facebook/Messenger",
  "Personnalisable via l'app N'YOOZ": "Customizable via N'YOOZ app",
  "Facturation mensuelle": "Monthly billing",
  "Box Internet": "Home Internet box",
  "Connexion domicile": "Home connection",
  "Connexion domicile illimitée (bridée)": "Unlimited home connection (throttled)",
  "Connexion domicile illimit\u00e9e (brid\u00e9e)": "Unlimited home connection (throttled)",
  "Installation incluse": "Installation included",
  "Data uniquement": "Data only",
  "Compatible routeur 4G": "4G router compatible",
  "Compatible routeur 4G/5G": "4G/5G router compatible",
  "Forfait étudiant": "Student plan",
  "Forfait \u00e9tudiant": "Student plan",
  "100 SMS autres réseaux": "100 SMS other operators",
  "100 SMS autres r\u00e9seaux": "100 SMS other operators",
  "200 SMS autres réseaux": "200 SMS other operators",
  "200 SMS autres r\u00e9seaux": "200 SMS other operators",
  "Contenu streaming premium": "Premium streaming content",

  // Generic
  "Bonus data": "Data bonus",
  "Offre limitée": "Limited offer",
  "Offre limit\u00e9e": "Limited offer",
  "Sans engagement": "No commitment",
  "Recharge automatique": "Auto top-up",
  "Application mobile": "Mobile app",
  "Service client 24/7": "24/7 customer service",
  "Réseau national": "National network",
  "R\u00e9seau national": "National network",
  "Couverture nationale": "National coverage",
};

function translateFeatures(featuresJson) {
  try {
    const parsed = JSON.parse(featuresJson);
    if (!Array.isArray(parsed)) return featuresJson;
    const translated = parsed.map(f => TRANSLATIONS[f] || TRANSLATIONS[f.trim()] || f);
    return JSON.stringify(translated);
  } catch {
    return featuresJson;
  }
}

const offers = db.prepare('SELECT id, name, features FROM Offer').all();
const update = db.prepare('UPDATE Offer SET features = ? WHERE id = ?');

let updated = 0, skipped = 0;
console.log(`\n🔄 Translating features for ${offers.length} offers...\n`);

for (const offer of offers) {
  const translated = translateFeatures(offer.features);
  if (translated !== offer.features) {
    update.run(translated, offer.id);
    console.log(`✅ Updated: ${offer.name}`);
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\n🎉 Done! ${updated} offers updated, ${skipped} already in English.\n`);
db.close();
