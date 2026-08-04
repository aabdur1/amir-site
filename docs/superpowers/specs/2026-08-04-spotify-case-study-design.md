# Spotify Listening Case Study — Design

**Date:** 2026-08-04
**Status:** Approved (design conversation, this session)

## Goal

Publish the "My Spotify Listening, 2021–2026" Tableau dashboard as the site's
second /work case study, with a homepage Projects card linking to it. Showcase
Tableau skills plus the full personal-data pipeline behind the dashboard.
Structure the addition so every future viz is a data-only change.

## Decisions already made

- **Approach:** data-driven addition with two generalizations (CSP route
  pattern + data-driven embed placeholder). Hand-rolled interactive
  recreations of the findings were considered and rejected — the click-gated
  embed already provides the interactivity (Year parameter, cross-chart
  hover), and recreations would showcase JS rather than Tableau.
- **Ordering:** Spotify leads the /work index as number `01`; the airline
  study renumbers to `02` (slug/URL unchanged).
- **Voice:** quantified and honest, no manufactured passion narrative, no AI
  tells. Same register as the airline study.

## Verified facts (sources: live dashboard, Amir's provided facts, repo README)

| Fact | Value |
|---|---|
| Data window | Dec 2021 – Jul 2026 (~4.7 years) |
| Raw plays | 61,230 |
| Music streams (podcasts excluded) | 57,200 |
| Hours of music | 1,437 |
| Distinct artists / tracks | 3,341 / 8,408 |
| Skip definition | play under 30 seconds |
| Average skip rate | 45.7% |
| Peak skip cell | Wednesday 1pm, 52.9% |
| Never-played hour | Friday 3am (only silent hour of the week) |
| Monthly-hours low / high | Feb 2023: 5.39 h · May 2026: 67.94 h |
| Era annotations | "First festivals: Heatwave + North Coast, 2023", "MS MIS starts" |
| Genre shift | bass music overtakes hip-hop/rap at the summer-2023 festival window |
| Genre enrichment | Last.fm API artist lookups, ~98.3% artist coverage, cached locally |
| Pipeline | pandas notebooks: concat JSON → local timestamps → real-listen threshold → sessions, skip flags, discovery dates → aggregate CSV extracts |
| Privacy stance | aggregates only; raw listening history never leaves Amir's machine (data/ gitignored) |
| Dashboard | Tableau Public, 7 views; Year Select parameter drives 5 of 7; KPI row deliberately all-time |
| Dashboard design | Catppuccin Latte, colorblind-validated palette, DM Serif Display title card — intentionally matches this site |
| Author-set size | 1000 × 3150 dashboard region + 27px Tableau bottom strip → embed 1000 × 3177 |
| View URL | `https://public.tableau.com/views/MySpotifyListening2021-2026/MySpotifyListening20212026` |
| Repo | `~/repos/spotify-listening-dashboard` — no public remote yet; GitHub link is a later data-only addition |

## 1. Data — new entry in `lib/work/case-studies.ts`

New `CaseStudy` prepended to `CASE_STUDIES`:

- `slug: 'spotify-listening'`, `number: '01'` (airline entry's `number`
  changes to `'02'`; nothing else about it changes)
- `title: 'My Spotify Listening, 2021–2026'`, `shortTitle: 'Spotify Listening'`
- `accent: 'sapphire'` (interactive accent; airline keeps peach)
- `depth: 'full'`
- `role: 'Solo pipeline, analysis, and dashboard'`
- `provenance: 'Personal project · my own Spotify data'` — first
  non-coursework provenance on the site
- `tech: ['Tableau', 'Python', 'pandas', 'Last.fm API']`
- **Metrics (4 stat tiles):** `1,437` hours of music · `57,200` music streams
  (of 61,230 raw plays) · `3,341` artists · `45.7%` average skip rate. Track
  count deliberately omitted — the embedded KPI row already shows it, and the
  skip-rate anchor is the more interesting number.
- **Embed:** view URL above, `width: 1000`, `height: 3177`,
  `kind: 'dashboard'`, caption naming seven linked views (exact copy at
  implementation).
- **Sections (headings fixed, prose drafted at implementation):**
  1. *The finding* — heaviest listening is weekday midday, not evening, and
     skips run hotter there (Wed 1pm 52.9% vs 45.7% overall); bass music
     overtakes hip-hop at the summer-2023 festival window; Friday 3am is the
     only hour of the week with zero plays in 4.7 years.
  2. *Context* — personal-data project outside coursework; dashboard styled
     Catppuccin Latte + DM Serif Display to sit natively in this site.
  3. *The data and the pipeline* — extended-streaming-history JSON export →
     pandas notebooks (real-listen threshold, sessions, skip flags) →
     Last.fm genre enrichment (~98.3% artist coverage) → aggregate CSV
     extracts; privacy stance stated plainly.
  4. *Seven views, one parameter* (`embed: true`) — dashboard structure; the
     Year parameter drives 5 of 7 views; KPI row deliberately all-time.
  5. *What the analysis showed* — the findings, expanded, with the honest
     caveats (e.g. skip threshold is a proxy, genre labels are Last.fm's).
  6. *What I would extend* — public GitHub release with a "request your own
     data" reproduce path; session/discovery-date analysis.
- **Links:** "View on Tableau Public" (view URL) + "See my full Tableau
  portfolio" (existing portfolio URL). No GitHub link until the repo is
  public.

## 2. Embed component generalization

`CaseStudyEmbed` (in `case-studies.ts`) gains two required fields:

- `kind: 'story' | 'dashboard'` — selects the placeholder motif SVG and the
  noun in the button ("Load the interactive story/dashboard") and the
  post-load status line.
- `caption: string` — the mono placeholder caption (airline keeps
  "interactive tableau story · four captioned points").

`components/work/tableau-embed.tsx`:

- Placeholder caption, button label, and loaded status line read from the
  embed data instead of hardcoded strings.
- Second hand-drawn placeholder motif for `kind: 'dashboard'`: KPI tile row +
  stacked area + heatmap cells, same 120×80 viewBox and existing palette
  classes as the story motif. Existing story motif untouched.

Both fields are required (not optional-with-defaults); the airline entry
supplies its current copy explicitly. Zero visual change to the airline page.

## 3. CSP — `next.config.ts`

Replace the route-scoped `/work/airline-flight-patterns` headers entry with
`/work/:path*`, same policy: base CSP + `frame-src https://public.tableau.com`.
`script-src` untouched; site-wide CSP stays third-party-free. This is the
"future vizzes" enabler: new Tableau case studies need no config edits.

Known gotcha: `next dev` does not hot-reload `next.config.ts` — restart the
dev server before verifying the embed loads.

## 4. Homepage Projects card — `components/projects.tsx`

New card inserted immediately before the airline card so the two viz cards
share the grid's final row (8 cards, even 2-col grid):

- name "My Spotify Listening, 2021–2026", subtitle "Personal-Data Pipeline &
  Tableau Dashboard", provenance "Personal project · Full case study"
- accent `sapphire`, pills `["Tableau", "Python", "pandas", "Last.fm API"]`
- quantified description (raw→filtered counts, pipeline, one finding)
- `url: '/work/spotify-listening'` (internal Link variant)

The section annotation count is computed from `projects.length`, so it
updates itself.

## 5. Derived surfaces and verification

Derives automatically from the array (verify, no new code): /work index card,
prev/next WorkNav (renders for the first time — two studies), sitemap entry,
per-slug OG image, JSON-LD `CreativeWork`/`BreadcrumbList`.

Verification checklist:

- `npm run build` and `npm run lint` clean (modulo the two known pre-existing
  lint errors)
- Restarted dev server: `/work/spotify-listening` renders; embed placeholder
  shows dashboard motif + correct copy; click loads the iframe with no CSP
  violations; airline embed still loads
- 320px: embed pans horizontally inside its wrapper, page never scrolls
  sideways
- Both themes; reduced-motion unaffected (embed has no animation)
- OG image route responds for the new slug; sitemap contains it

Post-merge bookkeeping: update CLAUDE.md (/work description, CSP note,
projects list) and the site-next-steps memory.

## Out of scope (recorded, not built)

- **Publishing the six draft case studies** in `lib/work/unpublished-drafts.ts`
  — each needs Amir's verified numbers; one per future session.
- **GitHub link on this study** — one-line `links` addition once the
  spotify-listening-dashboard repo has a public remote.
- **Third nav pill for /work** — previously decided against (320px nav
  balance); discovery stays homepage card + footer link.
- **Hand-rolled interactive findings** — rejected in approach selection.
