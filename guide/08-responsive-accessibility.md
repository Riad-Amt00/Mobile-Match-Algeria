---
noteId: "d02aba10611311f19a87c7da57e9aab3"
tags: []

---

# Guide 8 — Responsive Design & Accessibility, the simple version

How Mobile Match Algeria adapts to different screen sizes and to three languages, in plain
words — with the research, what is actually built, and an **honest list of the gaps** (so
you can answer the jury, including on what is *not* finished).

---

## 1. The idea, in three sentences

The app should be usable on a phone, a tablet, or a desktop, and in French, English, or
Arabic. It does this with **fluid layouts** that reflow as the screen narrows, a **mobile
menu**, and full **trilingual support including right-to-left Arabic**, plus **accessibility
basics** (labels for screen readers, semantic buttons, a light/dark theme). It is tuned
first for desktop, and finer phone/tablet polish is openly listed as future work.

---

## 2. Responsive design — how it works

- **Fluid grids**: the card grids use `auto-fit` / `minmax`, so the number of columns
  adjusts itself to the window width — wide screen shows several cards per row, narrow
  screen shows fewer, automatically.
- **A breakpoint at 768 px**: below that width, the offers grid collapses to a **single
  column** and the page/section titles shrink, so cards are readable on a phone.
- **A mobile menu**: the navbar collapses into a **hamburger menu** on small screens
  instead of the full horizontal bar.
- **Device-width viewport**: the page scales to the device, so there is no tiny zoomed-out
  desktop layout on a phone.

**Honest limit:** the interface is tuned primarily for desktop. It adapts to phones for the
main flows (browsing, the menu), but finer polish — especially the **comparison page on
narrow screens** and tighter breakpoints for very small phones — is listed as **future
work** in the thesis Perspectives, not claimed as finished.

---

## 3. Three languages, including right-to-left

- The whole interface is translated into **French, English, and Arabic** (one dictionary,
  `i18n.ts`).
- Selecting **Arabic flips the entire page to right-to-left**: the code sets
  `document.documentElement.dir = 'rtl'`, so text aligns right, rows reverse, and arrows
  flip direction. French and English stay left-to-right.
- The language choice is remembered between visits.

This matters for Algeria specifically, where Arabic is essential for reaching the full user
base — and RTL is the part of internationalisation people most often get wrong, so having
it work end-to-end is a real strength.

---

## 4. Accessibility basics

- **Labels for icon-only buttons**: buttons that show only an icon (clear search, help,
  dismiss) carry an `aria-label` so a screen reader announces what they do.
- **Live region**: the toast/notification area is an `aria-live="polite"` region, so
  screen readers read out confirmations and errors when they appear.
- **Semantic, keyboard-operable controls**: real `<button>` elements (not clickable divs),
  so they are focusable and usable with the keyboard.
- **Light / dark theme** and reasonable colour contrast.

**Honest limit:** these are the *basics*, not a full WCAG 2.2 audit. A complete pass (full
focus management, an aria-label on every control, a formal contrast check) is future work.

---

## 5. Where each part comes from (the research)

| Part | What it does | Comes from |
|------|--------------|------------|
| Fluid grids + a media-query breakpoint | one layout that adapts to any width | **Responsive Web Design** (Marcotte, 2011): fluid grids, flexible media, and media queries |
| Labels, live regions, semantic controls | usable with assistive technology | **WCAG 2.2** accessibility guidelines (perceivable, operable, understandable, robust) |

What is *ours* is the configuration: which grids are fluid, the 768 px breakpoint, the
hamburger menu, the trilingual dictionary, and the RTL switch.

---

## 6. What is done vs. what is future work (the honest summary)

| Area | Done | Future work |
|------|------|-------------|
| Layout reflow | fluid grids, single-column at ≤768 px, mobile menu | tighter polish below 768 px; the comparison page on narrow phones |
| Languages | FR / EN / AR, full RTL for Arabic | — |
| Accessibility | aria-labels on icon buttons, aria-live toasts, semantic buttons, theme | full WCAG 2.2 audit (complete focus management, contrast checks) |

Saying this plainly is a strength at the defense: you show you know both what works and
what you would do next.

---

## 7. The files

- **[globals.css](../src/app/globals.css)** — the fluid grids and the 768 px breakpoint (single-column offers, smaller titles).
- **[components/navbar.tsx](../src/components/navbar.tsx)** — the hamburger mobile menu.
- **[lib/lang-context.tsx](../src/lib/lang-context.tsx)** — sets the language and flips `dir` to RTL for Arabic.
- **[lib/i18n.ts](../src/lib/i18n.ts)** — the FR / EN / AR dictionary.
- **[components/toast.tsx](../src/components/toast.tsx)** — the `aria-live` notification region.

---

## 8. Jury questions — ready answers

- **Is it fully responsive?** It is responsive for the main flows: the grids reflow, the
  offers list becomes a single column on phones, and the navbar becomes a mobile menu. It is
  tuned first for desktop, and finer phone/tablet polish (the comparison page especially) is
  listed as future work — I am not claiming pixel-perfect on every device.
- **Is it accessible?** The basics are in place: screen-reader labels on icon buttons, a
  live region for alerts, semantic keyboard-operable controls, and a theme. A full WCAG 2.2
  audit is future work.
- **How do you support Arabic?** The whole UI is translated, and choosing Arabic switches
  the document to right-to-left, so the layout mirrors correctly — not just the text.
- **Why desktop-first?** The comparison and recommendation tables are information-dense and
  were easiest to get right on desktop first; the responsive reflow then covers smaller
  screens, with polish identified as the next step.

---

*This completes the core-concept guide set (web scraping, recommendation, search, class
diagram, notifications, comparison & savings, web data aggregation, responsive &
accessibility).*
