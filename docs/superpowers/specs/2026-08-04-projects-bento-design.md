# Projects Bento — Tiered Prominence Design

**Date:** 2026-08-04
**Status:** Approved (design conversation, this session)

## Goal

Replace the flat 9-card "Things I've Built" grid with a three-tier bento:
one featured card (Spotify) with a dashboard image plate, two emphasized
cards (DocDefend+, Parkinson's) with drawn illustrations, six standard
cards. Prominence comes from size and imagery only — the restrained
editorial styling (fig. annotations, mono captions, no badges or color
chrome) is a hard constraint.

## Decisions already made (Amir's calls)

- **Bento (Option B)** over thumbnails-on-uniform-grid; desktop-only
  enhancement, mobile collapses to the ordered single column.
- **Tier 1:** Spotify only — ONE featured card.
- **Tier 2:** DocDefend+ (first position) + Parkinson's, both with drawn
  SVG motifs. No screenshots in this tier — same-tier cards share the
  illustration language.
- **Tier 3:** WIEIAD, Theli, LightERP, CTF, StudentPM, Airline.
- **Featured image:** Amir's dashboard screenshot cropped **from the KPI
  row down** (KPI tiles + annotated Monthly Hours chart; the in-image
  title block is excluded so the card's own h3 does the naming).
- **Plate treatment:** mounted-print — border + `.reg-mark` registration
  corners (headshot precedent); the Latte-only screenshot reads as a
  deliberate plate in dark mode, no re-theming attempted.
- **Standard tier:** trim WIEIAD's description ~30% first, then
  `lg:grid-cols-3`; remaining row unevenness is accepted.
- **Theli:** standard tier; its launch-day swap stays data-only.

## 1. Data model — `components/projects.tsx`

Each entry in the `projects` array gains
`tier: 'featured' | 'emphasized' | 'standard'`. Array order becomes DOM
order and the mobile single-column order:

1. Spotify (featured) · 2. DocDefend+ (emphasized) · 3. Parkinson's
(emphasized) · 4. WIEIAD · 5. Theli · 6. LightERP · 7. CTF ·
8. StudentPM · 9. Airline (standard, current relative order preserved).

Card content is unchanged EXCEPT WIEIAD's description, replaced verbatim
with:

> Multimodal analysis of 1,100+ 'What I Eat in a Day' TikToks — Whisper,
> OCR, and CLIP features scored across five ED risk signals;
> coded-hashtag videos showed 2× signal prevalence. Gemini whole-video
> analysis of 467 video-days against HEI-2020.

(~25% shorter; keeps every number: 1,100+, five signals, 2×, 467,
HEI-2020. Drops the MyPlate clause and the "Final iteration:" scaffold.)

The `n = {projects.length} builds` annotation (9) and the
"all case studies →" header link are untouched.

## 2. Featured card (Spotify)

- Full-width card above the tiers below; sapphire top stripe and all
  existing card chrome (provenance, pills, internal-Link arrow) intact.
- Layout `lg:grid-cols-[1.1fr_1fr]`: text left, image plate right; below
  lg the plate stacks above the text (`order-first`, old-marquee
  precedent). Internal Link to `/work/spotify-listening` unchanged.
- **Asset:** source preserved at
  `.superpowers/assets/spotify-plate-source.png` (1792×1784, from Amir's
  message). Implementation crops from the top of the KPI row down
  (~y≈300 → bottom), resizes to 1600px wide, compresses via `sharp`
  (target ≤ 200KB; PNG vs mozjpeg q85, whichever is smaller), commits as
  `public/work/spotify-plate.png` (or `.jpg`). Served via `next/image`
  with explicit width/height and a `sizes` attr matching the column.
- **Alt text:** "KPI row and annotated monthly-hours line chart from the
  Spotify listening dashboard" (informative, not decorative — it shows
  real numbers).
- **Plate treatment:** rounded corners + `border-cream-border
  dark:border-night-border`, wrapped in four fixed `.reg-mark` corners at
  lg+ (marks outside the plate, like the headshot). No hover tilt — the
  card itself already lifts.

## 3. Emphasized pair (DocDefend+ first, then Parkinson's)

- 2-up row (`sm:grid-cols-2`), taller cards: padding up one step
  (p-6 sm:p-8), name at text-xl sm:text-2xl. All other card chrome
  (stripe, provenance, pills, arrow/link behavior) identical to today.
- Each card tops with a hand-drawn, aria-hidden SVG motif (~full card
  width, ~72–96px tall) using ONLY existing palette classes and the
  learn-card draw-on-reveal mechanism: `draw-stroke` (+`pathLength={100}`)
  on solid strokes, `spark-bar` (+`transformBox: 'fill-box'`) on fill
  rects, dashed strokes static, `is-drawn` toggled from the section's
  existing `useScrollReveal` state. Reduced motion renders fully drawn
  via the existing globals.css override.
- **Motifs** (final geometry authored at plan time): DocDefend+ — clinical
  note (document outline + ruled text lines) with a verification tick and
  a small defensibility score bar. Parkinson's — sustained-vowel waveform
  flowing into an ROC-style curve with a marked operating point.

## 4. Standard six

- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, padding tightened to p-5,
  name stays text-lg. Two rows of three at lg; uneven row heights
  accepted (WIEIAD trimmed per §1 reduces the worst case).
- Entry animations restagger by DOM index across all tiers (existing
  `300 + i * 100`ms formula, i = flat index).

## 5. Verification

- `npm test` (296), `npm run test:e2e` (18), `tsc --noEmit`, lint (only
  the 2 known errors), production build.
- Browser: 320px (single column, correct order, no horizontal scroll),
  768px (emphasized 2-up, standard 2-up), 1280px (bento reads: full-width
  plate card → 2 emphasized → 3×2 standard), dark mode (plate reads as
  mounted print), `prefers-reduced-motion` (motifs fully drawn, no
  animation), image weight ≤ 200KB and next/image serving responsive
  sizes.
- CLAUDE.md: rewrite the "Projects grid order is deliberate" bullet as
  the bento pattern (tiers, plate asset path, motif mechanism); update
  the projects.tsx file-structure line. Memory: mark
  projects-tiered-prominence as shipped/superseded.

## Out of scope (recorded, not built)

- **DocDefend+ case study** — the NEXT case study to publish from
  `lib/work/unpublished-drafts.ts`, pending Amir's verified numbers. Real
  UI screenshots belong THERE, not on the emphasized card; when it
  publishes, the emphasized card's `url` flips from the external vercel
  link to the internal `/work/...` click-through (data-only change).
- **Parkinson's case study** — same queue, after DocDefend+ or alongside.
- **Screenshots/figures for tier 2** — rejected; same-tier cards share
  the drawn-illustration language.
- **Theli launch-day swap** — unchanged, data-only on its standard card.
