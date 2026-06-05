---
noteId: "96006cd0610f11f19a87c7da57e9aab3"
tags: []

---

# Guide 6 — Comparison & Savings, the simple version

How Mobile Match Algeria lets users put plans side by side, see the differences as charts,
and know how much they would save — in plain words, with the research, a worked example,
and ready answers for the jury.

---

## 1. The idea, in three sentences

Once a user has a few candidate plans, they need to compare them fairly and see which is
the best deal. The platform shows the selected plans **side by side in a table**, draws a
small **bar chart per metric** (price, data, …) so the differences are visual, and — when
the comparison is started from the recommendations page — adds a **savings** figure
showing how much cheaper each plan is than the user's monthly budget.

---

## 2. How it works — four steps

1. **Pick plans to compare** — the user ticks "Compare" on offer cards; the chosen ids are
   passed to the compare page (`/compare?ids=…`).
2. **Side-by-side table** — each plan becomes a column; the rows are the attributes (price,
   data, calls, SMS, validity, network), and each plan's column is tinted its operator
   colour so the eye can follow it down.
3. **One bar chart per metric** — a small Recharts bar chart for price and for data volume;
   the best bar for that metric is highlighted, so "cheapest" and "most data" are obvious
   at a glance.
4. **Savings** — if the user arrived from the recommendations page (so their budget is
   known), an extra **annual-savings** bar chart is drawn and each recommended plan card
   shows its monthly, yearly, and percentage saving.

---

## 3. The savings formula

Savings are measured against the user's **monthly budget**:

- **Monthly saving** = budget − plan price (never below 0)
- **Annual saving** = monthly saving × 12
- **Percentage** = monthly saving ÷ budget

So a plan that costs less than the budget shows how much is left over each month, per year,
and as a share of the budget. It is plain arithmetic — nothing is estimated or invented.

---

## 4. Where each part comes from (the research)

| Part | What it does | Comes from |
|------|--------------|------------|
| **Side-by-side table** | compare like-for-like | the standard comparison-table pattern in interface design (**Nielsen Norman**) |
| **One chart per metric** | turn numbers into a visual ranking | information visualisation principles (**Munzner, 2014**); visual comparison of multi-attribute items / rankings (**Gratzl et al., 2013 — LineUp**) |
| **Savings figures** | budget − price, ×12, and % | plain arithmetic against the user's stated budget (ours) |

What is *ours* is the configuration: which metrics get a chart, that the best value is
highlighted, and that savings are computed against the user's monthly budget.

---

## 5. A worked example

The user's budget is **6\,000 DA/month** and they compare three plans, having come from
the recommendations page. For the top plan, **Dima Ooredoo at 750 DA**:

- **Monthly saving** = 6\,000 − 750 = **5\,250 DA**
- **Annual saving** = 5\,250 × 12 = **63\,000 DA**
- **Percentage** = 5\,250 ÷ 6\,000 = **88\% below budget**

The table shows the three plans in columns; the price chart makes 750 DA the shortest
(best) bar, the data chart highlights whichever plan carries the most GB, and the annual-
savings chart makes the biggest saver the tallest bar.

---

## 6. The files

- **[compare/compare-content.tsx](../src/app/compare/compare-content.tsx)** — the compare page: the side-by-side table, the per-metric Recharts bar charts (`MiniChart`), and the annual-savings chart.
- **[recommendation.ts](../src/lib/recommendation.ts)** — computes each plan's monthly `savings` (budget − price) for the recommendation cards.
- **[recommend/page.tsx](../src/app/recommend/page.tsx)** — shows the monthly / yearly / percentage saving on each recommended plan.
- **[offer-card.tsx](../src/components/offer-card.tsx)** — the "Compare" button that selects plans.

---

## 7. Jury questions — ready answers

- **Why charts and a table, not just a table?** The table gives exact values; the bar
  charts turn those into an instant visual ranking (shortest price bar, tallest data bar),
  which is faster to read. Tables for precision, charts for the glance.
- **Why does the savings chart only sometimes appear?** Savings need a budget to compare
  against. That is only known when the comparison is launched from the recommendations page
  (which has the user's profile), so the savings chart is shown only there.
- **How is the saving calculated — is it estimated?** No estimation: it is budget minus the
  plan's price, times twelve for the year, and as a percentage of the budget.
- **What if a plan costs more than the budget?** The saving is floored at 0 (no negative
  savings shown).
- **Which charting library?** Recharts (a React charting library); each chart is one metric
  with the best performer highlighted.

---

*Next guide: responsive design & accessibility, or web data aggregation. Tell me which.*
