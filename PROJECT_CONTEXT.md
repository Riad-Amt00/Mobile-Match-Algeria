# Project Context & Progress — Mobile Match Algeria

> Single orientation document. Read this first to get the full picture, then jump to the
> files it points to. Author: **AMRATE Riad** (IFAG, Licence MFE). Supervisors:
> Mme Benahmed-El-Alia Nadia, M. Balla Amar.

---

## 1. What this is

Two deliverables in one repo:

1. **A web app** — *Mobile Match Algeria*: compares mobile plans from the three Algerian
   operators (Djezzy, Ooredoo, Mobilis), with automated scraping, a recommendation
   engine, structured search, comparison/charts, a savings indicator, and notifications.
2. **The thesis** (`memoire/`, LaTeX/XeLaTeX) — the *mémoire de fin d'études* describing it.

The subject brief is [`FICHE2_MFE-IFAG_El Alia- Balla_VF.pdf`](FICHE2_MFE-IFAG_El%20Alia-%20Balla_VF.pdf) (5 objectives: responsive multi-operator comparison app; automated scraping/aggregation; recommendation engine; comparison visualization + savings calculator; notifications).

---

## 2. Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** (strict).
- **Prisma 7** + **better-sqlite3** / **SQLite** (`prisma/schema.prisma` is the source of truth).
- **NextAuth v5** (Credentials, JWT, bcrypt).
- **Playwright** (headless **Microsoft Edge**) + **Cheerio** for scraping.
- **SQLite FTS5** for search; **Recharts** for charts; **zod** for API validation; **Vitest** for tests.
- Thesis: **XeLaTeX + biber**, Times New Roman, IFAG formatting.

Run: `npm run dev` · Test: `npm test` (**121 tests pass**, `tsc --noEmit` clean) · DB: `prisma/dev.db`.

---

## 3. Subsystems and where they live

| Subsystem | Key files | State |
|-----------|-----------|-------|
| **Scraping** | [src/lib/scraper/](src/lib/scraper/) — `fetch.ts` (Edge+Playwright, retries 0/7/18s, circuit breaker), `validate.ts` (FR/EN/AR parsers + 12-rule `validateOffer`), `djezzy.ts`/`ooredoo.ts`/`mobilis.ts` (+ verified fallback datasets), `index.ts` (orchestrator: upsert, price history, deactivation guard, notifications) | **83 active offers** (live / scrapable only); daily cron 03:00 Africa/Algiers via [src/instrumentation.ts](src/instrumentation.ts); image-only families (Mobilis Revolution, Djezzy iZZY) **excluded 2026-06-02** so the catalogue is 100% live — see Perspectives |
| **Recommendation** | [src/lib/recommendation.ts](src/lib/recommendation.ts) | **TOPSIS + ROC** (see §5) — fully researched |
| **Search** | `src/app/api/offers/route.ts`, `src/lib/search-tokens.ts`, `src/lib/search-fts.ts` | regex token parser → Prisma `where` + SQLite FTS5 (BM25); "Read as" chips |
| **Comparison / charts** | `src/app/compare/compare-content.tsx`, `src/components/offer-card.tsx` | side-by-side table + Recharts bar charts + faceted filters + savings indicator |
| **Notifications** | `index.ts` + `src/components/navbar.tsx`, `src/app/admin/page.tsx` | split streams: user (new_offer/price_drop/recommendation) vs admin (scrape_complete/failed/data_stale) |
| **Auth / admin** | NextAuth config, `src/app/admin/` | admin claim code; admin can trigger scrape |

Offer field sentinels: `voiceMinutes`/`smsCount`/`dataGB` = **-1 means unlimited**, `0` means none. Cross-network SMS/calls and recharge credit are parsed into `features` and surfaced on the card (`offerCredit` regex is accent-tolerant for the "CRÈDIT" typo).

---

## 4. The thesis (`memoire/`)

- Build: run [`memoire/compile.bat`](memoire/compile.bat) **or** `xelatex main.tex; biber main; xelatex; xelatex` (MiKTeX at `%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64`). PDF is permission-locked from the cover merge — to read pages with PyMuPDF use `d.authenticate('')`.
- Files: [`memoire/main.tex`](memoire/main.tex), [`preamble.tex`](memoire/preamble.tex) (loads `amsmath`+`amssymb`; colon caption/chapter separators), `front/`, `chapters/ch1_concepts.tex`…`ch4_tests.tex`, `chapters/introduction.tex`, `chapters/conclusion.tex`, `back/bibliography.bib`.
- **Current state:** compiles clean, **90 pages total**, **body ≈ 59 pages** (IFAG wants 60–70 → ~1 under; expand Ch.4 to clear it if needed). **Zero em-dashes** anywhere (prose + separators); test count is **121**.
- **Ch.1 covers 7 researched concept areas** (pure research, no project mention), then §1.7 gives the per-discipline "what we chose & why": web data aggregation, web scraping, recommendation, search, comparison/visualization, notifications, responsive/accessibility. See [memory: state_of_art_coverage].
- IFAG rules: margins 2.5cm, résumé 200–250 words (FR/EN/AR), chapter intro+conclusion mandatory, §2.18 AI-use declaration was MISSING (check).

---

## 5. The recommendation engine — IMPORTANT (fully researched, 0 invented)

Rewritten on 2026-06-02 to **TOPSIS + Rank-Order-Centroid weights** after the user insisted the *formula itself* be from research (the earlier lexicographic-semiorder had a tuned formula — now removed). Pipeline in [recommendation.ts](src/lib/recommendation.ts):

1. **Hard filters** = the **conjunctive (constraint) method**, non-compensatory MADM screening — *Hwang & Yoon (1981)*. Budget is a strict ceiling.
2. **Weights** from the user's criterion ranking via **Rank-Order Centroid (ROC)** — *Barron & Barrett (1996)* — e.g. price #1, data #2 → 0.75 / 0.25.
3. **Ranking** = **TOPSIS** — *Hwang & Yoon (1981)*; recent guide *Taherdoost & Madanchian (2023)*: vector-normalise → weight → ideal/anti-ideal → Euclidean distances → closeness `C = S⁻/(S⁺+S⁻)`. Score = `C×100`.

**Researched vs ours:** method + formula + weights are all published. *Ours* = configuration only (not formulas): which attributes are filters vs ranked criteria; budget = hard ceiling; encoding conventions (unlimited = 1.5× pool max so it's the ideal; equal weights when no ranking). The priority order ("price first") is the **user's input**, not ours. TOPSIS is **compensatory** (accepted). Answers the supervisor's "Euclidean distance?" → yes. Full detail in [memory: recommendation_engine] and thesis Ch.3 §3.4.

---

## 6. Plain-language guides (`guide/`)

Simple, defense-focused, **md + PDF** (build: `pandoc x.md -s -o _g.tex --toc -V mainfont=Arial -V monofont="Cascadia Mono" -V monofontoptions=Scale=0.82 -V geometry:margin=1.8cm -V colorlinks=true`, then `xelatex` twice — pandoc's own xelatex returns a spurious non-zero, so make the `.tex` then compile it; **no Arabic glyphs** in these PDFs).

- [guide/01-web-scraping.md](guide/01-web-scraping.md) (+ .pdf) — done.
- [guide/02-recommendation-engine.md](guide/02-recommendation-engine.md) (+ .pdf) — done (TOPSIS, with a "which part comes from which research" table).
- Pending: search engine, notifications, comparison/savings.

---

## 7. Standing rules & preferences (do not violate)

- **Commit AND push everything** to GitHub after each change (`origin/main`). Repo: `Riad-Amt00/Mobile-Match-Algeria`.
- **Author = the user only** — do NOT add a `Co-Authored-By: Claude` trailer.
- When editing the thesis, **respect the IFAG fascicule** rules.
- **Never fabricate results**; every tool/method choice in the thesis needs a **peer-reviewed (or authoritative) citation** — recent sources preferred alongside the seminal origin. The user is highly sensitive to "researched vs invented" — state it honestly, never overclaim.
- Keep responses concise; keep concept guides simple.
- Windows + PowerShell; GitHub pushes occasionally fail on a transient network error — just retry.

---

## 8. Open items / honest gaps

- **Body ≈ 59 pp** vs IFAG 60–70 → expand Ch.4 (Evaluation) from real artefacts if you want to clear 60.
- **No real user study** (FICHE wanted 50+ testers, >85% satisfaction) — documented honestly as future work; never fabricate satisfaction numbers.
- Image-only families (Mobilis Revolution, Djezzy iZZY) are **excluded** so the catalogue is 100% live / machine-readable (OCR tested 29–43%, rejected; Cloud Vision = future path, documented in Perspectives). Removed 2026-06-02 from DB + scraper + seeds.
- A few "this project" phrasings may remain in Ch.1 §1.3/§1.4 (optional polish).
- IFAG §2.18 AI-use declaration — verify it exists.

---

## 9. Memory index (detailed notes live here)

The assistant's memory (`MEMORY.md` + files) holds the fine detail. Most relevant:
`recommendation_engine.md` (TOPSIS rework), `state_of_art_coverage.md` (Ch.1's 7 concepts),
`concept_guides.md` (guide series), `scraping_state.md`, `search_engine.md`,
`notification_system.md`, `fiche_subject.md`, `ifag_rules.md`, `feedback*.md`,
`memoire_state.md`, `thesis_code_audit.md`, `supervisor_notes_round.md`.
