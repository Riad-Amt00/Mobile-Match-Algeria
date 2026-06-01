# Guide 1 — Web Scraping (how it works, the tools, file by file)

This is the first of several guides. It explains, in plain language, the **web
scraping** part of Mobile Match Algeria: what it is, the tools we chose and why,
how the whole thing works step by step, and what each file does. Read it once and
you'll be able to explain and defend this part of the project confidently.

---

## 1. What is web scraping (in one minute)

The three operators (Djezzy, Ooredoo, Mobilis) publish their mobile plans on their
websites, but **none of them offers an API** (a clean data feed a program could
ask). So to keep our database up to date automatically, our program acts like a
visitor: it **opens the operator pages, reads the HTML, and pulls out the numbers**
(price, data, minutes, SMS, validity). That is web scraping — automated reading of
public web pages.

We only read **public marketing pages** (the same pages anyone sees in a browser),
we respect delays, and we collect **no personal data**. This is the legal, ethical
way to do it.

---

## 2. The tools we use, and why

| Tool | Role in our project | Why this one |
|------|---------------------|--------------|
| **Playwright** | Drives a real web browser from code (opens pages, waits, reads the HTML). | The operator sites have anti-bot protection that **blocks plain HTTP requests**. A real browser passes; a simple `fetch()` gets rejected. Playwright is the modern, reliable choice for this. |
| **Microsoft Edge (headless)** | The actual browser Playwright drives, with no window shown. | Using a *real* installed browser is the **least detectable** option. If Edge isn't installed, the code automatically falls back to Playwright's bundled Chromium. |
| **Cheerio** | Reads the downloaded HTML and lets us pick out fields with CSS selectors (like jQuery, but on the server). | Once the browser hands us the HTML, we no longer need the heavy browser to *parse* it. Cheerio is tiny and fast for that job. |
| **node-cron** | Runs the scrape automatically once a day. | Simple, runs inside our own Node server — no extra service to host. |

**One sentence to remember:** *Playwright + real headless Edge fetch the page,
Cheerio parses it, and node-cron runs the whole thing daily.*

---

## 3. How it works, step by step

```
                ┌──────────── once a day at 03:00 (or on demand) ───────────┐
                ▼                                                            │
  For each operator (Djezzy, Ooredoo, Mobilis):                             │
                                                                            │
  1. FETCH    Playwright opens the operator page in headless Edge.          │
              (3 spaced tries; if the site stays unreachable, a "circuit    │
               breaker" stops trying and we use a verified fallback set.)   │
                                                                            │
  2. PARSE    Cheerio reads the HTML; the operator file pulls out           │
              price / data / minutes / SMS / validity / features.           │
                                                                            │
  3. NORMALISE Raw text → clean numbers (e.g. "1 500 DA" → 1500,            │
               "60 Go" → 60, "24hr" → 1 day). Units in FR / EN / AR.        │
                                                                            │
  4. VALIDATE  Every offer must pass 12 sanity rules before it can be       │
               saved (price in range, no HTML in the name, etc.).           │
                                                                            │
  5. SAVE     New offer → insert. Existing offer → update. Price changed →  │
              record it in price history. Price dropped → notify users.     │
              Offers no longer on the site → marked inactive.               │
                                                                            │
  6. INDEX    Rebuild the search index and send admin/user notifications.   │
```

A healthy run for all three operators finishes in a few seconds and ends with
~98 active offers in the database.

---

## 4. A live example: one Djezzy LEGEND plan, from HTML to a saved offer

Let's trace a single real plan all the way through, so the pipeline stops being
abstract. (This is the exact HTML our tests use as a fixture.)

### Step 1 — the raw HTML the operator page gives us
A plan on the Djezzy LEGEND page is one `<article class="price-card">`. Each line
is a `<li class="feature-item">` whose `<i>` icon class tells us *what kind* of
value it is, and whose text holds the value. (Inline styles trimmed for clarity.)

```html
<article class="price-card" aria-label="Offer 4000">
  <div class="price-logo"><img src=".../logo-legend.png" alt="Offer logo"></div>
  <ul class="price-features">
    <li class="feature-item"><i class="icon-Internet"></i>
        <span><span>200 GO</span><br><span>Internet</span></span></li>
    <li class="feature-item"><i class="icon-Appels-Illimite"></i>
        <span><span>APPELS ILLIMITÉS</span><br><span>VERS TOUS LES RÉSEAUX</span></span></li>
    <li class="feature-item"><i class="icon-SMS-illimite"></i>
        <span><span>SMS ILLIMITÉS</span><br><span>VERS DJEZZY</span></span></li>
    <li class="feature-item"><i class="icon-Courrier"></i>
        <span><span>30 SMS</span><br><span>VERS LES AUTRES RÉSEAUX</span></span></li>
    <li class="feature-item"><i class="icon-Historique"></i>
        <span>30 Jours<br>Validité</span></li>
    <li class="feature-item"><span>Pour 4000 DA</span></li>
  </ul>
</article>
```

### Step 2 — the function that reads the card
This is the part of `parsePriceCards()` (in [djezzy.ts](../src/lib/scraper/djezzy.ts))
that does the work. It loops over the `feature-item` lines and routes each one by
its icon class. (Trimmed to the branches that fire for this card.)

```ts
$('article.price-card').each((_, el) => {
  const card = $(el)
  let priceDA = 0, dataGB = 0, voiceMinutes = -1, smsCount = -1, validityDays = 30
  const features: string[] = []

  card.find('li.feature-item').each((_, fi) => {
    const item = $(fi)
    const iconClass = item.find('i').attr('class') || ''  // e.g. "icon-Internet"
    const text = item.text().replace(/\s+/g, ' ').trim()  // e.g. "200 GO Internet"

    if (iconClass.includes('icon-Internet')) {
      const gb = parseGB(text); if (gb > 0) dataGB = gb               // "200 GO" -> 200
    } else if (iconClass.includes('icon-Appels-Illimite')) {
      voiceMinutes = -1                                               // -1 = unlimited
      features.push(/tous les r.seaux/i.test(text)
        ? 'Unlimited calls (all networks)' : 'Unlimited Djezzy calls')
    } else if (iconClass.includes('icon-SMS-illimite')) {
      smsCount = -1
      features.push(/djezzy/i.test(text) ? 'Unlimited Djezzy SMS' : 'Unlimited SMS')
    } else if (iconClass.includes('icon-Courrier')) {
      const sm = text.match(/(\d+)\s*SMS/i)                           // "30 SMS ..." -> 30
      if (sm) features.push(`${sm[1]} SMS to other networks`)
    } else if (iconClass.includes('icon-Historique')) {
      validityDays = parseValidityDays(text)                          // "30 Jours" -> 30
    }
    const p = parsePriceDA(text); if (p > 0 && !priceDA) priceDA = p  // "Pour 4000 DA" -> 4000
  })

  pushIfValid(offers, {
    name: `Djezzy LEGEND ${priceDA}`, type, priceDA, dataGB,
    voiceMinutes, smsCount, validityDays, network: '4G', features, sourceUrl: pageUrl,
  })
})
```

### Step 3 — the normalizers that turn messy text into clean numbers
The helpers above (`parseGB`, `parsePriceDA`, `parseValidityDays`, in
[validate.ts](../src/lib/scraper/validate.ts)) are **unit-anchored**: a bare number
with no unit returns 0, which is what stops a price being misread as a data volume.
(Trimmed to the branches this card hits; the real ones also read MB, weeks, months,
hours, and Arabic.)

```ts
export function parseGB(text: string): number {
  const gb = text.match(/([\d.,]+)\s*(?:go|gb|giga)/i)   // needs a unit
  if (gb) return parseFloat(gb[1].replace(',', '.'))     // "200 GO" -> 200
  return 0                                               // "200" alone -> 0
}

export function parsePriceDA(text: string): number {
  const la = text.match(/(\d[\d\s]*?)\s*da\b/i)          // "Pour 4000 DA" -> 4000
  return la ? parseInt(la[1].replace(/\s/g, '')) : 0
}

export function parseValidityDays(text: string): number {
  const d = text.match(/(\d+)\s*jours?/i)                // "30 Jours" -> 30
  return d ? parseInt(d[1]) : 30
}
```

### Step 4 — the clean offer object the parser produces
After the loop, the messy card has become one tidy record:

```jsonc
{
  "name": "Djezzy LEGEND 4000",
  "type": "PREPAID",
  "priceDA": 4000,        // from "Pour 4000 DA"
  "dataGB": 200,          // from "200 GO"
  "voiceMinutes": -1,     // -1 = unlimited  (APPELS ILLIMITÉS)
  "smsCount": -1,         // -1 = unlimited  (SMS ILLIMITÉS VERS DJEZZY)
  "validityDays": 30,     // from "30 Jours"
  "network": "4G",
  "features": [
    "Unlimited calls (all networks)",   // VERS TOUS LES RÉSEAUX
    "Unlimited Djezzy SMS",             // VERS DJEZZY
    "30 SMS to other networks"          // icon-Courrier "30 SMS"
  ],
  "sourceUrl": "https://www.djezzy.dz/legend"
}
```

### Step 5 — the validation gate
`validateOffer()` checks it: price 4000 is within 10–50000, data 200 within range,
the name is clean, the type is valid, and `dataGB !== priceDA`. It returns
`{ valid: true }`, so the orchestrator saves it (insert or update + price-history row).

### Step 6 — what you finally see in the app
The card rebuilds human labels from those fields: the `-1` sentinels plus the feature
lines become **Data 200 GB · Calls Unlimited (all networks) · SMS Unlimited (Djezzy)
+ 30 off-net · 4000 DA**. That "+ 30 off-net" is exactly the `icon-Courrier` line
surviving all the way from the raw HTML to the screen.

---

## 5. The files, one by one

All scraping code lives in [src/lib/scraper/](../src/lib/scraper/). Here is each file
and what it does.

### [fetch.ts](../src/lib/scraper/fetch.ts) — the browser fetcher (the "hands")
This is the only file that touches the browser.
- Launches **headless Microsoft Edge** through Playwright (falls back to bundled
  Chromium if Edge is missing).
- Sets a realistic browser identity (French locale, Algiers timezone, normal
  user-agent) and hides the obvious "I am a robot" signal.
- `fetchPage(url)` tries each page up to **3 times** with spaced waits (0s, 7s,
  18s) — operator servers (Djezzy especially) randomly drop connections, and
  spreading the tries catches a good moment.
- A **circuit breaker**: after repeated failures it stops hammering a dead site
  and lets the operator fall back to verified data quickly instead of hanging.

### [validate.ts](../src/lib/scraper/validate.ts) — the shared parsers + the safety gate
The single source of truth for turning messy text into clean data.
- **Parsers**: `parseGB`, `parsePriceDA`, `parseValidityDays` — each understands
  French (Go/Mo, jours/mois), English (GB/MB), and Arabic (جيغا/ميغا، يوم/شهر).
  They are *unit-anchored*: `parseGB("60")` returns 0; only `"60 Go"` returns 60.
  This prevents misreading a price as a data amount.
- `cleanText` / `cleanFeatureText` — strip HTML and junk, keep real feature lines.
- **`validateOffer`** — checks **12 rules** (price between 10 and 50 000 DA, data
  not absurd, no `<script>` in the name, validity 1–365 days, a valid type, and
  cross-checks that catch parsing bugs). Nothing reaches the database without
  passing this gate.

### [djezzy.ts](../src/lib/scraper/djezzy.ts), [ooredoo.ts](../src/lib/scraper/ooredoo.ts), [mobilis.ts](../src/lib/scraper/mobilis.ts) — one per operator
Each file knows the HTML shape of *its* operator's website.
- It asks `fetch.ts` for each page, then uses **Cheerio** selectors (e.g.
  `article.price-card`, `li.feature-item`) to read out the fields, calling the
  shared parsers from `validate.ts`.
- Sentinels: a value of **`-1` means "unlimited"** and **`0` means "none"** for
  minutes and SMS (so "Unlimited Djezzy SMS" is stored as `-1`, and the human
  label is rebuilt later for display).
- **Fallback dataset**: if the live site is unreachable or changed its HTML, the
  file returns a **hand-verified set of offers** so the app never goes blank.
  (For Mobilis Revolution and Djezzy iZZY the prices are inside *images*, so those
  few are always hand-maintained — see the "stale data" reminder below.)

### [index.ts](../src/lib/scraper/index.ts) — the orchestrator (the "brain")
Runs the whole job and is the only file that writes to the database.
- Runs the three operator scrapers in turn.
- Re-validates every offer (defense in depth), then **de-duplicates** by slug
  (carousels can output the same plan twice).
- **Saves**: inserts new offers, updates existing ones; when a price changes it
  writes a row to **price history**; when a price *drops* it notifies users.
- **Deactivates stale offers**: any active offer that's no longer on the site gets
  marked inactive — with a safety guard that *skips* this if the run returned
  suspiciously few offers (so a broken run can't wipe the catalogue).
- Rebuilds the **search index**, then sends notifications: a summary to admins
  ("Scrape complete — N new"), failure alerts to admins, and personalised
  "match found" alerts to users.
- **Stale-data reminder**: the image-only offers can't be auto-checked, so after
  45 days the orchestrator reminds admins (at most once a week) to re-verify them.

### [../instrumentation.ts](../src/instrumentation.ts) — the automatic starter
Next.js runs this once when the server boots. It:
- registers the **daily cron at 03:00 Africa/Algiers**,
- rebuilds the search index on boot,
- runs a scrape **on startup if the DB is empty or the last scrape was >23h ago**,
- schedules a **weekly cleanup** of old scrape logs.
This is why scraping "just works" with `npm run dev` — no separate process needed.

### [../cron.ts](../src/lib/cron.ts) — optional standalone runner
The same daily schedule, but as a separate process you can run by hand. Only
needed if you don't want it inside the web server.

### [../../app/api/cron/route.ts](../src/app/api/cron/route.ts) and [../../app/api/admin/scrape/route.ts](../src/app/api/admin/scrape/route.ts) — manual triggers
- `POST /api/cron?secret=…` lets an external scheduler trigger a scrape (protected
  by a secret).
- The admin route lets a logged-in admin run a scrape **on demand** from the Admin
  panel button.

### [__tests__/](../src/lib/scraper/__tests__/) — proof it works
`parsers.test.ts` and `validate.test.ts` test the parsing and validation against
**saved real HTML samples** (fixtures), so we can prove the scraper behaves
correctly without hitting the live sites.

---

## 6. The smart parts worth mentioning at the defense

- **Why a real browser?** Plain HTTP is blocked by anti-bot; a genuine headless
  Edge passes. (This is the static-vs-dynamic choice from Chapter 1.)
- **Retries + circuit breaker** → resilient to flaky operator servers without
  hanging.
- **Verified fallback dataset** → the site is never empty even when an operator is
  down or redesigns its page.
- **Unit-anchored parsers + a 12-rule validation gate** → no garbage ever reaches
  the database (this directly fixed an early "price read as data" bug).
- **Per-operator deactivation with a safety guard** → the catalogue stays in sync
  with reality, but one broken run can't erase it.
- **Trilingual parsing (FR / EN / AR)** → the operators mix languages, and we read
  all three.

---

## 7. Likely jury questions (and short answers)

- **"Is scraping legal?"** — We read only public pages, obey `robots.txt` and rate
  limits, identify ourselves, and store no personal data. Same data any visitor
  sees.
- **"What if a site changes?"** — The operator file fails gracefully and the
  verified fallback dataset takes over; tests on saved HTML catch breakage early.
- **"Why not just use an API?"** — No Algerian operator publishes one; scraping is
  the standard method when data is only in HTML.
- **"How often does it run?"** — Automatically every day at 03:00 (Algiers), plus
  on startup if data is missing/old, plus on demand from the Admin panel.

---

*Next guide: the recommendation engine (the formula, the tiers, the files). Tell me
when you want it and I'll write `02-recommendation-engine.md` the same way.*
