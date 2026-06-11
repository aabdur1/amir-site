# Job-Search Revamp — Design Spec

**Date:** 2026-06-10
**Goal:** Turn amirabdurrahim.com from an admired portfolio into a conversion funnel for healthcare-data-analyst recruiters (target roles: Clinical Data Analyst, Healthcare Data Analyst, Epic/EHR Reporting Analyst, Healthcare BI Analyst — Chicago or remote).

## Scope

Six workstreams, one sprint. Out of scope (deferred): GitHub repo links on project cards, WIEIAD demo video, gallery teaser on homepage, Experience section restructure.

## 1. Hero — positioning blurb + CTA pair

**Blurb.** New `<p>` between the tagline and the social icons, body font (`--font-body`), `text-ink-subtle` / `dark:text-night-muted`, max-w-lg:

> Healthcare data analyst with 2+ years of Epic EHR experience — building clinical ML, BI, and documentation tools. MS in MIS at UIC, graduating Fall '26.

The italic tagline ("Healthcare meets technology — Chicago.") stays unchanged above it.

**CTA pair.** New flex row below the blurb, above the social icons:

- **Primary — "Get in touch":** filled pill, `bg-mauve dark:bg-mauve-dark` with on-accent text (white in light, `night` base in dark — verify AA contrast), `href="mailto:amirabdurrahim@gmail.com"`. First filled button on the site; mauve is the structural/interactive accent.
- **Secondary — "View resume":** outlined pill matching nav-pill language, `href="/Amir_Abdur-Rahim_Resume.pdf"`, `target="_blank"` with "(opens in new tab)" aria-label. View, not forced download.

Both: `btn-lift` spring hover, ≥44px tap height, mono/badge font consistent with existing pill text.

**Motion integration:**
- New `ctaRef` parallax layer in `SCROLL_RATES` between `tagline` (0.12) and `social` (0.06) — use 0.09.
- Entry stagger re-spaced: label 0.1s → name 0.3/0.5s → rule 0.5s → tagline 0.8s → **blurb ~0.95s → CTAs ~1.1s** → social ~1.3s → badges from ~1.7s. Keep the parallax-attach timeout (2.5s) ahead of the last badge delay.
- Reduced motion: blurb/CTAs render with no animation start state (existing `mounted`/`prefersReduced` pattern).

## 2. Featured Theli card (Projects section, "marquee above grid")

New `components/featured-project.tsx` (client component), rendered in `projects.tsx` between `SectionHeader` and the grid.

- **Layout:** single full-width card, `grid lg:grid-cols-[2fr_1fr]`; text left, app screenshot right. On mobile the screenshot stacks above the text. Whole card is one `<a href="https://theli.app" target="_blank">` with descriptive aria-label.
- **Accent: rosewater.** Extend `ACCENT_STYLES` (lib/styles.ts) and the local `STRIPE_STYLES` (projects.tsx) with `rosewater` entries (`--color-rosewater` tokens already exist; `--color-gold-muted` is its legacy alias). Card gets the `border-t-[3px]` rosewater stripe + rosewater-tinted bg/border/hover, visually distinct from the four grid accents.
- **Content:**
  - Name: **Theli**
  - Status pill (peach, next to name): **"Coming soon — App Store"**
  - Subtitle: *Privacy-first iOS Nutrition Scanner — independent product*
  - Description: "Barcode lookup + on-device label OCR, Apple Health sync. No accounts, no ads, no tracking."
  - Pills: `Swift 6`, `SwiftUI`, `Vision OCR`, `HealthKit`
  - External-link arrow (top right), matching existing card pattern.
- **Screenshot:** the **Home screen** shot from `~/repos/clearlabel/views/`, optimized (resized/compressed) into `public/theli/home.png` (or .webp), rendered with `next/image` + explicit width/height and `alt="Theli home screen showing a day's logged meals"` (the card link carries its own descriptive aria-label).
- **Launch-day swap is data-only:** URL → App Store link, pill text → "On the App Store" (stays peach). No layout change.
- Entry animation: same `fade-in-up` family, delay before the grid cards (grid card delays shift by +100ms).

## 3. Project card provenance tags

Optional `provenance?: string` on the `projects` array; rendered as a small mono-font label (`--font-mono`, 12px, `text-ink-subtle`) adjacent to/below the subtitle, echoing the Experience card's date styling.

| Project | provenance |
|---|---|
| Parkinson's Voice Screening | Graduate coursework · UIC MS MIS |
| WIEIAD Risk Scoring | Graduate coursework · UIC MS MIS |
| DocDefend+ | Graduate coursework · UIC MS MIS |
| StudentPM | Graduate coursework · UIC MS MIS |
| LightERP | Graduate coursework · UIC MS MIS |
| CTF & Security Labs | SANS competition |

## 4. Certifications cleanup

No badges removed.

- **Grouping:** split the single grid into two labeled subsections — **"Data & Analytics"** and **"Cloud & Security"** — using the Skills-section category-label pill style. Classifier lives in `lib/badges.ts`: a badge whose name matches `/looker|lookml|bigquery|snow|data/i` → Data & Analytics; everything else → Cloud & Security. Future Credly badges self-sort; misfiled ones get a manual override map if needed.
- **Image normalization:** every badge image renders inside a fixed square container with `object-contain`, consistent padding, cream/white chip background, and a hairline border in both themes — so certificate-screenshot images sit cleanly next to designed badges.
- Preserve: Credly fetch pipeline, sort-newest-first *within* each group, "View all on Credly" link.

## 5. Learn teaser — homepage "06 / Learning in Public"

New `components/learn-teaser.tsx` section after Education in `app/page.tsx`.

- Section conventions: `SectionDivider`, `SectionHeader` (`number="06"`, label "Learn", title "Learning in Public"), `useScrollReveal`, `aria-labelledby="section-06"`. Background: `bg-cream-dark/50 dark:bg-night-card/40` — Education (05) is transparent, so 06 takes the tinted background to continue the alternation.
- Intro line: "Interactive ML explainers, built while studying for my data mining coursework."
- Three mini-cards: **Neural Networks, PCA, SHAP** — title + subtopic line + section count, no illustrations (lighter than `/learn` index cards). Each links to `/learn/<slug>`. Data sourced from `lib/learn/artifacts.ts` by slug constant (`TEASER_SLUGS = ['neural-networks', 'pca', 'shap']`) so titles/subtopics never drift.
- Footer link: "Explore all 7 →" to `/learn` (derive the count from the artifacts array length, don't hardcode 7).

## 6. Resume PDF

1. **Content pass (with Amir):** incremental edits to `~/job_search/resume.md` per job_search conventions — newest certs and projects added, quantified bullets, no wholesale rewrites.
2. **Export pipeline:** small script (lives in job_search workspace, not this repo) renders resume.md → print-styled HTML → PDF via headless Chrome (Playwright already on the machine; no new deps in amir-site). Single-page target, standard serif/sans print styling, no site branding required.
3. **Output:** copy to `public/Amir_Abdur-Rahim_Resume.pdf` in amir-site. Future updates = rerun script + copy + commit.

## Cross-cutting

- **Files:** new `components/featured-project.tsx`, `components/learn-teaser.tsx`; modified `components/hero.tsx`, `components/projects.tsx`, `components/certifications.tsx`, `lib/styles.ts`, `lib/badges.ts`, `app/page.tsx`; assets `public/theli/`, `public/Amir_Abdur-Rahim_Resume.pdf`.
- **Conventions to honor:** no component libraries, inline SVGs only, fold `animationDelay` into the `animation` shorthand, client components marked, WCAG AA contrast (`text-ink-subtle` minimum for readable text), 44px touch targets, `prefers-reduced-motion` support, 320px-safe.
- **Verification:** `npm run build`, `npm run lint` (2 known pre-existing errors excepted), Playwright visual pass at 1440/390/320 widths in light + dark, reduced-motion spot check on new hero elements, keyboard tab-through of new interactive elements.
- **Docs:** update `CLAUDE.md` (sections list, new components, conventions) at the end of the sprint.

## Sequencing note

This sprint is deliberately time-boxed (~1–2 days). It precedes — and must not displace — the job-search restart: re-dated action plan, LinkedIn update, and first Tier-1 applications follow immediately after.
