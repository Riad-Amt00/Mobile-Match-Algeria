@AGENTS.md

# IFAG Charte de Rédaction — Mémoire PFE Licence Informatique

These rules govern the LaTeX thesis at `memoire/`. They come from the official IFAG fascicule (LMI, 20 avril 2026). **Any thesis edit must respect ALL of these.**

## Format
- Paper: A4. Margins: 3 cm left, 2.5 cm right/top/bottom.
- Font: Times New Roman — 12 pt body, 14 pt chapter titles, 13 pt section, 12 pt subsection.
- Line spacing: 1.5. Paragraph spacing: 6 pt after paragraphs.
- Pagination: lowercase roman (i, ii, iii…) for all prelims before the Introduction; arabic from the Introduction onwards.
- Section numbering: max 3 levels (e.g. 1.1.1). Never 4 levels.
- Body volume: 50–60 pages. Annexes: 5–10 pages.

## Mandatory structure (this exact order)
Page de garde → Dédicaces → Remerciements → Résumé (FR + EN + AR, ≤200 words each, ≤5 keywords each) → Table of Contents → List of Figures → List of Tables → Abbreviations → General Introduction → Chapters → General Conclusion → Bibliographic References → Annexes

## Chapter content (indicatif — not prescriptive)
- Ch1: État de l'art (context, existing solutions, technical background)
- Ch2: Analyse des besoins (requirements, UML use case, sequence, class diagrams)
- Ch3: Conception (architecture, data model, detailed design)
- Ch4: Réalisation et tests (implementation, screenshots, test results)

## Figures and tables
- Figure caption: BELOW the figure, italic, centered. Format: `Figure X.Y — Description.`
- Table title: ABOVE the table, bold or bold-italic, centered. Format: `Table X.Y — Description.`
- Minimum width: 1/3 of text width.
- Every figure and table MUST be referenced in the text BEFORE it appears.
- Any abbreviation inside a caption must be spelled out in the caption itself.

## Bibliography
- APA format. Alphabetical by first author's surname.
- Every reference in the bibliography must be cited in the text; every in-text citation must appear in the bibliography.

## Writing style
- Use "nous" (we/our) or third person. NEVER "je" (I).
- Short, clear sentences. No journalistic or informal register.
- Every paragraph: minimum 2 sentences. No single-sentence paragraphs.
- Logical transitions between sections and chapters.
- All factual claims must be backed by a bibliographic reference or measured/verified data.

## AI declaration — §2.18 CRITICAL REQUIREMENT
Any use of AI generative tools (ChatGPT, Copilot, Gemini, Claude, etc.) MUST be explicitly declared:
- Location: in the General Introduction or in a dedicated "Outils d'aide à la rédaction" section.
- Content: name of the tool + nature of the assistance provided.
- The student remains fully responsible for all content.
- **The current thesis is MISSING this declaration. It must be added to `chapters/introduction.tex`.**

## Thesis-specific compliance notes
- The thesis merges Ch2 (Analysis) + Ch3 (Conception) into a single Chapter 2. This is acceptable since the fascicule says structure is "à titre indicatif."
- Ch3 (Implementation) covers IFAG's Ch4 scope. Acceptable for the same reason.
- All diagrams must match the actual implemented system exactly (no invented features, no wrong entity names, no wrong route paths).
- Screenshots described in the text must match the actual running application.
