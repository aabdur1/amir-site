# Spotify Listening Case Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the "My Spotify Listening, 2021–2026" Tableau dashboard as the second /work case study (leading as 01) with a homepage Projects card, generalizing the embed placeholder and CSP so future vizzes are data-only changes.

**Architecture:** Everything derives from `lib/work/case-studies.ts` (index, page, nav, sitemap, OG, JSON-LD). Four source changes: the `CaseStudyEmbed` type + `tableau-embed.tsx` gain data-driven placeholder copy and a second motif; `next.config.ts` swaps the per-slug Tableau CSP override for `/work/:path*`; a new `CaseStudy` entry is prepended; one homepage card is inserted in `projects.tsx`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4. No new dependencies. No test framework exists in this repo — verification is `npx tsc --noEmit`, `npm run lint`, `npm run build`, and dev-server browser checks (Playwright MCP or manual).

**Spec:** `docs/superpowers/specs/2026-08-04-spotify-case-study-design.md` — its "Verified facts" table is the source of truth for every number. Do not alter a number without checking it there.

## Global Constraints

- Branch: `feat/spotify-case-study` (already exists; spec committed on it).
- Voice: quantified, honest, first person; no manufactured passion narrative, no AI tells. Match the airline entry's register.
- No component libraries, no icon libraries; SVGs are hand-drawn inline with existing palette classes (`stroke-peach dark:stroke-peach-dark` etc.).
- Minimum readable text size 12px; decorative-only for `text-ink-muted`/`text-ink-faint`.
- `next dev` does NOT hot-reload `next.config.ts` — restart the dev server after Task 2 before any embed verification.
- Known pre-existing lint errors (do not fix, do not count as failures): `interactive-headshot.tsx`, `masonry-grid.tsx`.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Data-driven embed placeholder (type + component + airline data)

**Files:**
- Modify: `lib/work/case-studies.ts:39-47` (the `CaseStudyEmbed` interface) and `:93-98` (the airline `embed` object)
- Modify: `components/work/tableau-embed.tsx`

**Interfaces:**
- Consumes: existing `CaseStudyEmbed` type, existing `TableauEmbed` component.
- Produces: `CaseStudyEmbed` with two new **required** fields — `kind: 'story' | 'dashboard'` and `caption: string`. Task 3's new entry supplies `kind: 'dashboard'`, `caption: 'interactive tableau dashboard · seven linked views'`.

- [ ] **Step 1: Extend the `CaseStudyEmbed` interface**

In `lib/work/case-studies.ts`, replace the interface with:

```ts
export interface CaseStudyEmbed {
  // Clean view URL (no share query params); the component adds embed params.
  url: string
  // Iframe title + placeholder copy.
  title: string
  // Author-set fixed size of the Tableau viz, used to shape the frame.
  width: number
  height: number
  // Placeholder motif + button/status noun ("story" / "dashboard").
  kind: 'story' | 'dashboard'
  // Mono caption line on the click-gate placeholder.
  caption: string
}
```

- [ ] **Step 2: Update the airline embed data**

In the airline entry's `embed` object, add the two fields (current copy, verbatim):

```ts
    embed: {
      url: 'https://public.tableau.com/views/IP4_17645572320100/Story1',
      title: 'US Airline Flight Patterns — interactive Tableau story',
      width: 1016,
      height: 991,
      kind: 'story',
      caption: 'interactive tableau story · four captioned points',
    },
```

- [ ] **Step 3: Verify the type change is load-bearing**

Run: `npx tsc --noEmit`
Expected: PASS (airline entry satisfies the new required fields; nothing else constructs a `CaseStudyEmbed`).

- [ ] **Step 4: Rework `tableau-embed.tsx` to read the new fields and add the dashboard motif**

Replace `PlaceholderIllustration` and the two hardcoded copy sites. Rename the existing SVG to `StoryIllustration` (body unchanged), add `DashboardIllustration`, and select on `embed.kind`:

```tsx
// Story-points motif: a line chart, a highlight table, and a scatter — the
// three views inside the airline story.
function StoryIllustration() {
  /* body identical to the current PlaceholderIllustration — do not edit */
}

// Dashboard motif: KPI tile row, stacked area, heatmap cells, ranked bars —
// echoing the views inside the Spotify dashboard.
function DashboardIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      {/* KPI tile row */}
      <g className="stroke-ink-faint dark:stroke-night-border" fill="none" strokeWidth="1">
        <rect x="8" y="10" width="30" height="14" rx="2" />
        <rect x="45" y="10" width="30" height="14" rx="2" />
        <rect x="82" y="10" width="30" height="14" rx="2" />
      </g>
      <g className="stroke-mauve dark:stroke-mauve-dark" strokeWidth="2" strokeLinecap="round">
        <line x1="13" y1="17" x2="27" y2="17" />
        <line x1="50" y1="17" x2="64" y2="17" />
        <line x1="87" y1="17" x2="101" y2="17" />
      </g>
      {/* stacked area */}
      <path d="M8 52 L8 42 L20 44 L32 38 L44 41 L44 52 Z" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.75" />
      <path d="M8 42 L20 44 L32 38 L44 41 L44 34 L32 30 L20 36 L8 34 Z" className="fill-peach dark:fill-peach-dark" opacity="0.7" />
      {/* heatmap cells */}
      <g className="fill-sapphire dark:fill-sapphire-dark">
        <rect x="56" y="32" width="8" height="8" rx="1" opacity="0.3" />
        <rect x="66" y="32" width="8" height="8" rx="1" opacity="0.85" />
        <rect x="76" y="32" width="8" height="8" rx="1" opacity="0.55" />
        <rect x="56" y="42" width="8" height="8" rx="1" opacity="0.6" />
        <rect x="66" y="42" width="8" height="8" rx="1" opacity="0.4" />
        <rect x="76" y="42" width="8" height="8" rx="1" opacity="0.2" />
      </g>
      {/* ranked artist bars */}
      <g className="fill-mauve dark:fill-mauve-dark">
        <rect x="90" y="32" width="22" height="4" rx="1" opacity="0.9" />
        <rect x="90" y="39" width="16" height="4" rx="1" opacity="0.65" />
        <rect x="90" y="46" width="11" height="4" rx="1" opacity="0.45" />
      </g>
      {/* baseline + peach commit dot, echoing the story motif */}
      <line x1="8" y1="64" x2="112" y2="64" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
      <circle cx="60" cy="64" r="2" className="fill-peach dark:fill-peach-dark" />
    </svg>
  )
}
```

In `TableauEmbed`, the three copy sites become data-driven:

```tsx
  if (!loaded) {
    return (
      <div className="rounded-xl border border-cream-border dark:border-night-border bg-cream-dark/40 dark:bg-night-card/50 px-6 py-12 sm:py-16 text-center">
        <div className="flex justify-center mb-5">
          {embed.kind === 'dashboard' ? <DashboardIllustration /> : <StoryIllustration />}
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] uppercase text-ink-subtle dark:text-night-muted mb-6">
          {embed.caption}
        </p>
        <button type="button" onClick={() => setLoaded(true)} className={PILL_PRIMARY}>
          Load the interactive {embed.kind}
        </button>
        <p role="status" className="mt-4 text-[13px] text-ink-subtle dark:text-night-muted max-w-md mx-auto leading-relaxed">
          Loads third-party content from public.tableau.com only when you ask. Nothing is fetched
          before this click.
        </p>
      </div>
    )
  }
```

and the post-load status line:

```tsx
      <p role="status" className="mt-2 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
        interactive {embed.kind} loaded from public.tableau.com {'·'} scroll sideways on small screens
      </p>
```

Update the component's top comment to note the placeholder copy/motif are data-driven via `embed.kind`/`embed.caption`.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc PASS; lint shows only the two known pre-existing errors.

- [ ] **Step 6: Verify zero visual change on the airline page**

Run: `npm run dev`, open `http://localhost:3000/work/airline-flight-patterns`.
Expected: placeholder shows the story motif and the caption "interactive tableau story · four captioned points"; button reads "Load the interactive story". Click it: iframe loads (dev server already has the airline CSP route), status line reads "interactive story loaded from …".

- [ ] **Step 7: Commit**

```bash
git add lib/work/case-studies.ts components/work/tableau-embed.tsx
git commit -m "refactor: data-driven Tableau embed placeholder (kind + caption)"
```

---

### Task 2: Generalize the Tableau CSP override to /work/:path*

**Files:**
- Modify: `next.config.ts:38-46` (comment + nothing else in `TABLEAU_CSP`) and `:90-93` (the headers entry)

**Interfaces:**
- Consumes: existing `TABLEAU_CSP` constant.
- Produces: every `/work/*` page may frame `https://public.tableau.com`. Task 3's new page relies on this.

- [ ] **Step 1: Update the comment and the route source**

Replace the `TABLEAU_CSP` comment block (the constant itself is unchanged):

```ts
// /work/:path* only: click-gated Tableau Public vizzes embed as plain
// iframes, so only frame-src widens (default-src 'self' is the fallback that
// would otherwise block them). Route-scoped to the case-study surface so the
// site-wide policy never loosens, and generalized so a new Tableau case
// study needs no config edit. No script-src change — the Embedding API was
// deliberately skipped to keep third-party JS out of the page context.
```

Replace the headers entry:

```ts
      {
        source: '/work/:path*',
        headers: [{ key: 'Content-Security-Policy', value: TABLEAU_CSP }],
      },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify with a restarted dev server**

Restart `npm run dev` (headers() is not hot-reloaded). Open `/work/airline-flight-patterns`, click "Load the interactive story".
Expected: iframe still loads, zero CSP violations in the browser console. Check the response header: `curl -sI http://localhost:3000/work/airline-flight-patterns | grep -i content-security` shows `frame-src https://public.tableau.com`.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat: scope Tableau frame-src CSP to /work/:path*"
```

---

### Task 3: The Spotify case-study entry (leads as 01; airline renumbers to 02)

**Files:**
- Modify: `lib/work/case-studies.ts` — prepend one entry to `CASE_STUDIES`; change the airline entry's `number: '01'` to `number: '02'` (nothing else on it)

**Interfaces:**
- Consumes: `CaseStudyEmbed` fields from Task 1; CSP from Task 2.
- Produces: slug `spotify-listening` — Task 4's card links to `/work/spotify-listening`.

- [ ] **Step 1: Prepend the entry**

Insert as the FIRST element of `CASE_STUDIES` (exact content; numbers are verified against the spec's facts table):

```ts
  {
    slug: 'spotify-listening',
    number: '01',
    title: 'My Spotify Listening, 2021–2026',
    shortTitle: 'Spotify Listening',
    summary:
      'A personal-data pipeline from my own Spotify extended streaming history: 61,230 raw plays cleaned with pandas, genre-enriched via the Last.fm API, and published as a seven-view Tableau dashboard covering 4.7 years of listening.',
    lead:
      'My heaviest listening block is weekday midday, not evening — and midday is also where I skip hardest, peaking at 52.9% on Wednesdays at 1pm against a 45.7% overall skip rate. This dashboard turns 4.7 years of my own Spotify history into seven linked views, including the window where bass music overtook hip-hop and the one hour of the week I have never played music at all.',
    role: 'Solo pipeline, analysis, and dashboard',
    provenance: 'Personal project · my own Spotify data',
    accent: 'sapphire',
    depth: 'full',
    tech: ['Tableau', 'Python', 'pandas', 'Last.fm API'],
    metrics: [
      { value: '1,437', label: 'Hours of music, Dec 2021 – Jul 2026' },
      { value: '57,200', label: 'Music streams kept of 61,230 raw plays' },
      { value: '3,341', label: 'Distinct artists across 8,408 tracks' },
      { value: '45.7%', label: 'Average skip rate (plays under 30 seconds)' },
    ],
    embed: {
      url: 'https://public.tableau.com/views/MySpotifyListening2021-2026/MySpotifyListening20212026',
      title: 'My Spotify Listening, 2021–2026 — interactive Tableau dashboard',
      width: 1000,
      height: 3177,
      kind: 'dashboard',
      caption: 'interactive tableau dashboard · seven linked views',
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          'Three things came out of 4.7 years of my own listening data. The clearest: my heaviest listening happens on weekday middays — the hour-by-day heatmap peaks between roughly 11am and 3pm early in the week — and that same block is where I skip hardest, topping out at 52.9% at Wednesday 1pm against my 45.7% overall rate. That pairing reads like background listening: lots of starts, quick judgments.',
          'Second, the genre mix has a clean before-and-after. Hip-hop/rap carried 2022; bass music takes the top share in the window of my first festivals — Heatwave and North Coast, summer 2023 — and holds it from then on. The annotated line on the dashboard is not a slow drift. It is a handoff.',
          'And one negative-space finding: Friday at 3am is the only hour of the week with zero plays across the entire 4.7-year window.',
        ],
      },
      {
        heading: 'Context',
        body: [
          'This is a personal project, not coursework: my own data, my own questions. Spotify provides a full-history export on request — Privacy Settings, then "extended streaming history" — and everything here is built from that export: pandas notebooks for cleaning and features, the Last.fm API for genres, Tableau Public for the dashboard.',
          'The dashboard is deliberately styled to sit inside this site: Catppuccin Latte palette, colorblind-validated, with a DM Serif Display title card. Load it below and it should read like a page of this site that happens to be Tableau.',
        ],
      },
      {
        heading: 'The data and the pipeline',
        body: [
          'The export arrives as JSON: 61,230 raw play records from December 2021 through July 2026. A set of numbered pandas notebooks concatenates the files, localizes timestamps, applies a real-listen threshold, and derives sessions, skip flags — a skip is a play under 30 seconds — and first-play discovery dates. Excluding podcasts leaves 57,200 music streams: 1,437 hours across 3,341 artists and 8,408 tracks.',
          'The export carries no genre field, so genres come from the Last.fm API: one cached lookup per artist, mapped into six groups — bass music, hip-hop/rap, electronic, classical/score, house/dance, and everything else. Coverage is about 98.3% of artists.',
          'The raw export is personal data, so it never leaves my machine. The repo gitignores it, and what Tableau receives are aggregate CSV extracts, not row-level plays.',
        ],
      },
      {
        heading: 'Seven views, one parameter',
        embed: true,
        body: [
          'The dashboard is seven linked views on one tall canvas. An all-time KPI row sits on top; below it, a monthly-hours line annotated with eras (the February 2023 low of 5.39 hours, the first-festivals window, the start of my MS program, the May 2026 peak of 67.94 hours), a 100% stacked genre mix, an hour-by-day heatmap, a diverging skip-rate heatmap, and top artists colored by genre group with cross-chart hover.',
          'A global Year Select parameter drives five of the seven views. The KPI row ignores it on purpose, so the headline numbers stay whole-history while everything below re-slices. The skip definition and the podcast exclusion are stated on the dashboard itself — the numbers carry their caveats with them.',
        ],
      },
      {
        heading: 'What the analysis showed',
        body: [
          'The midday block is the clearest result: listening concentrates around weekday middays, and skip rate rises with it. High-volume hours are also high-churn hours. The diverging heatmap makes that visible because it is anchored at my own 45.7% average rather than at zero — a red cell means skippier than my normal, not skippy in the abstract.',
          'The genre handoff holds up against the annotations: hip-hop/rap dominant through 2022, bass music taking the top share in the months around summer 2023, the same window as my first festivals. Correlation is not causation, but the timing is unambiguous — and it is the kind of ground truth you only have when the analyst is also the subject.',
          'The honest limitations: a 30-second skip threshold is a proxy for intent, not a measurement of it; genre labels are Last.fm community tags mapped by me into six groups; and the export covers Spotify only, so anything played elsewhere is invisible. All three are stated on the dashboard or in the pipeline rather than smoothed over.',
        ],
      },
      {
        heading: 'What I would extend',
        body: [
          'The repo is queued for a public release: aggregated extracts plus a reproduce path, since anyone can request their own extended streaming history from Spotify. A Top Tracks view is queued for the dashboard itself. Beyond that, the pipeline already computes session and discovery-date features the dashboard does not use yet — session length by time of day, and how long a newly discovered artist survives in rotation, are the two analyses I would build next.',
        ],
      },
    ],
    links: [
      {
        label: 'View on Tableau Public',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/viz/MySpotifyListening2021-2026/MySpotifyListening20212026',
        external: true,
      },
      {
        label: 'See my full Tableau portfolio',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/vizzes',
        external: true,
      },
    ],
  },
```

- [ ] **Step 2: Renumber the airline entry**

In the airline entry, change `number: '01',` to `number: '02',`. Touch nothing else on it.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc PASS; only the two known lint errors.

- [ ] **Step 4: Verify the page and both derived surfaces**

With the (restarted, post-Task-2) dev server:

- `http://localhost:3000/work` — two cards, Spotify first as 01/, airline as 02/.
- `http://localhost:3000/work/spotify-listening` — title block, four metric tiles, six sections; prev/next nav appears (first time two studies exist): "Flight Patterns" as next.
- Click "Load the interactive dashboard" — the dashboard motif placeholder is replaced by the 1000×3177 iframe; zero CSP console violations; page scrolls past the tall frame normally.
- At a 320px-wide viewport: the frame pans inside its own wrapper; the page body never scrolls horizontally.
- `curl -s http://localhost:3000/sitemap.xml | grep spotify-listening` — entry present.
- `curl -sI http://localhost:3000/work/spotify-listening/opengraph-image | head -1` — HTTP 200 (if the OG route 500s on the em-dash-heavy title, check the Satori gotchas in CLAUDE.md; expected to pass since all values render as single template strings).

- [ ] **Step 5: Commit**

```bash
git add lib/work/case-studies.ts
git commit -m "feat: publish Spotify listening case study as /work 01"
```

---

### Task 4: Homepage Projects card

**Files:**
- Modify: `components/projects.tsx:79` — insert one object into the `projects` array immediately BEFORE the "US Airline Flight Patterns" entry (so the two viz cards share the grid's final row)

**Interfaces:**
- Consumes: `/work/spotify-listening` route from Task 3; existing internal-Link card variant (`url` starting with `/`).
- Produces: nothing downstream.

- [ ] **Step 1: Insert the card**

```ts
  {
    name: "My Spotify Listening, 2021–2026",
    subtitle: "Personal-Data Pipeline & Tableau Dashboard",
    provenance: "Personal project · Full case study",
    description:
      "4.7 years of my own Spotify extended streaming history — 61,230 raw plays cleaned to 57,200 music streams with pandas, genre-enriched via the Last.fm API (~98.3% artist coverage), and published as a seven-view Tableau dashboard: midday listening peaks, a 45.7% skip-rate anchor, and the week's one silent hour. Includes the live interactive viz.",
    pills: ["Tableau", "Python", "pandas", "Last.fm API"],
    accent: "sapphire" as const,
    url: "/work/spotify-listening",
  },
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc PASS; only the two known lint errors.

- [ ] **Step 3: Verify the homepage grid**

Dev server, `http://localhost:3000`: Projects section shows 8 grid cards (even 2-col grid at sm+), Spotify and Airline sharing the last row; Spotify card has the sapphire top stripe, internal navigation (no new tab), arrow icon present; section annotation reads "n = 9 builds" (computed). Check 320px: single column, card intact.

- [ ] **Step 4: Commit**

```bash
git add components/projects.tsx
git commit -m "feat: homepage card for the Spotify listening case study"
```

---

### Task 5: Full verification, CLAUDE.md, memory

**Files:**
- Modify: `CLAUDE.md` (three spots, below)
- Modify: memory `site-next-steps.md` (outside repo, not committed)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: clean build (prebuild fetch-webr runs from its lock; requires network on cold cache). All /work pages in the route list.

- [ ] **Step 2: Serve the production build and spot-check**

Run: `npm run start`, then re-verify: `/work/spotify-listening` embed click-load with zero CSP violations; `/work/airline-flight-patterns` unchanged; homepage grid; dark mode on the case page (embed placeholder + motif read correctly in Mocha); OG image route 200 for both slugs.

- [ ] **Step 3: Update CLAUDE.md**

Three edits, matching what shipped:

1. **Metadata-driven /work bullet:** change "(currently: the Tableau airline story)" in the `case-studies.ts` file-structure line and the /work pattern paragraph to reflect two published studies (Spotify 01 personal project + airline 02), and note the embed placeholder is data-driven via `embed.kind`/`embed.caption`.
2. **Security Headers section:** change the route-scoped CSP sentence from `/work/airline-flight-patterns` to `/work/:path*` ("all case-study pages may frame public.tableau.com; frame-src ONLY").
3. **projects.tsx file-structure line:** update the grid list to include the Spotify card (8-card grid: Parkinson's, WIEIAD, DocDefend+, StudentPM, LightERP, CTF, Spotify, Airline).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md updates for Spotify case study + /work CSP scope"
```

- [ ] **Step 5: Update memory**

In `~/.claude/projects/-Users-amirabdurrahim-repos-amir-site/memory/site-next-steps.md`: record that the Spotify case study is implemented on `feat/spotify-case-study` (pending PR/merge), remove it from the queue, keep the unpublished-drafts item. Convert relative dates to absolute (2026-08-04).

- [ ] **Step 6: Hand off the branch**

Use superpowers:finishing-a-development-branch — expected outcome: PR to main via `commit-commands:commit-push-pr` per repo convention, after Amir reviews the rendered pages.

## Self-Review (completed at write time)

- **Spec coverage:** §1 data entry → Task 3; §2 embed generalization → Task 1; §3 CSP → Task 2; §4 homepage card → Task 4; §5 derived surfaces + verification + bookkeeping → Tasks 3.4/5. Out-of-scope items untouched. No gaps.
- **Placeholders:** none — all prose, SVG, and config content is written out.
- **Type consistency:** `kind: 'story' | 'dashboard'` and `caption: string` used identically in Tasks 1 and 3; `embed.kind`/`embed.caption` reads match the interface.
