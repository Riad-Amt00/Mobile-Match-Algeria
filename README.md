# Mobile Match Algeria

A web application that aggregates mobile-plan catalogues from the three Algerian operators (Mobilis, Djezzy, Ooredoo) and helps consumers find the plan best suited to their needs.

Developed as the *Mémoire de Fin d'Études* for the Licence en Métiers de l'Informatique at **IFAG Alger** (2025-2026).

---

## Features

The five features prescribed by the project subject sheet:

1. **Advanced structured search** — free-text queries parsed into typed tokens (operator, data, price, calls, SMS, network, plan type, "unlimited") with visible "Read as" chips so the user always sees how their query was interpreted.
2. **Multi-criteria filters** — operator tabs, plan-type pills, and a panel for price, data volume, and network generation.
3. **Side-by-side comparison** — up to three plans compared in a specification table together with per-metric bar charts (price, data).
4. **Savings calculator** — enter the current monthly bill and the system computes the best-matching plan plus monthly, annual, and percentage savings.
5. **In-app notification system** — split into a user stream (new offers, price drops, personalised recommendations) and an administrator stream (scrape success / failure).

Plus a **tiered-ranking recommendation engine** that combines categorical hard filters (operator, type, network, calls, SMS, budget ceiling) with a two-priority ordering on the continuous criteria (price and data).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Full-stack framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| ORM | Prisma 7 (better-sqlite3 driver adapter) |
| Database | SQLite |
| Authentication | NextAuth.js v5 (Credentials provider, JWT sessions) |
| Animations | Framer Motion |
| Charts | Recharts |
| Scraping | Playwright (headless Microsoft Edge) + Cheerio |
| Unit tests | Vitest |
| Thesis | XeLaTeX + Biber |

---

## Getting started

### Prerequisites

- Node.js 20 LTS or newer
- npm 10+
- Microsoft Edge installed (used by the scraper via Playwright; falls back to bundled Chromium automatically)

### Install and seed

```bash
npm install
cp .env.example .env        # then edit secrets in .env
npx prisma db push          # apply the schema to a fresh SQLite file
npx prisma db seed          # seed demo users and a sample catalogue
```

### Development

```bash
npm run dev                 # http://localhost:3000
```

### Tests

```bash
npm test                    # 118 unit tests across recommendation, scraper, search, and util modules
# default reporter has a glitch in vitest 4.1.5 — use verbose to confirm:
npx vitest run --reporter=verbose
```

### Production build

```bash
npm run build
npm start
```

---

## Demo accounts

Seeded by `prisma/seed.ts`:

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@mobilematch.dz` | `admin123456` |
| USER | `demo@mobilematch.dz` | `user123456` |

These are intentionally simple for evaluation; change before any real deployment.

---

## Project layout

```text
.
├── memoire/                   LaTeX thesis source (Mémoire de Fin d'Études)
│   ├── main.tex               Root document
│   ├── chapters/              Introduction, 4 chapters, conclusion
│   ├── front/                 Cover, dedication, acknowledgements, abstracts (FR/EN/AR)
│   ├── back/                  Bibliography (.bib) and annexes (UML, schema)
│   └── images/                Figures and screenshots
├── prisma/
│   ├── schema.prisma          Data model (8 application entities)
│   └── seed.ts                Demo users + sample catalogue
├── public/                    Static assets (operator logos, help screenshots)
├── scripts/
│   ├── db-audit.mjs           Database integrity check + counts
│   └── delete-user.mjs        Cascade-delete a user by email match
├── src/
│   ├── app/                   Next.js App Router pages and API routes
│   ├── components/            Shared UI components
│   └── lib/
│       ├── scraper/           Per-operator scrapers + validate.ts + snapshot tests
│       ├── recommendation.ts  Tiered-ranking engine
│       ├── search-tokens.ts   Client-side mirror of the search parser
│       ├── i18n.ts            Trilingual dictionary (EN / FR / AR)
│       └── ...
├── take-help-screenshots.mjs  Regenerates /help page screenshots
└── take-thesis-screenshots.mjs Regenerates thesis figures from the running app
```

---

## Building the thesis

```bash
cd memoire
xelatex -interaction=nonstopmode main.tex
biber main
xelatex -interaction=nonstopmode main.tex
xelatex -interaction=nonstopmode main.tex
```

The compiled `main.pdf` follows the IFAG charte (Times New Roman 12 pt, 2.5 cm margins all sides, body 50-60 pages, trilingual abstracts, APA bibliography).

---

## Performance characteristics

Measured on a single development machine in production mode (`npm run build && npm start`), with zero errors at every concurrency level:

| Endpoint | Throughput | p95 |
| --- | ---: | ---: |
| `GET /api/offers` | 215 req/s @ 50 | 288 ms |
| `GET /api/offers?search=...` | 321 req/s @ 50 | 180 ms |
| `POST /api/recommendations` | 60 req/s | 169 ms |

Sufficient headroom for the project's evaluation scale; PostgreSQL is identified as the migration path before any high-write-concurrency deployment.

---

## License

This work is provided for academic evaluation only. The repository is not licensed for redistribution at this stage.

---

## Author

**AMRATE Riad** — Licence en Métiers de l'Informatique, IFAG Alger (2025-2026)
Supervisors: Mme BENAHMED-EL-ALIA Nadia, M. BALLA Amar
