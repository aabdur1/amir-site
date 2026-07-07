# Design: "08/ SQL" — Runnable SQL Sandbox Artifact

**Date:** 2026-07-06
**Status:** Approved (brainstorm with Amir, 2026-07-06)
**Branch:** implement on `feature/design` (stacked, unmerged — do not merge/push to main, do not deploy)

## Context & Goal

Amir targets healthcare data analyst roles (summer 2026). SQL is the most-screened
skill for those roles and the one thing the current /learn lineup doesn't evidence.
This artifact is primarily an **employer signal** ("can teach the concept, built a
runnable engine into a static site"), secondarily a personal practice tool. R content
was considered and explicitly **parked** — no R anywhere in this build (R evidence
belongs in the planned case study, not an explainer).

Decisions already made during brainstorming — do not relitigate:

- **Placement:** Learn artifact `08/`, not a new top-level section. Inherits rail,
  tab bar, per-slug OG card, sitemap, JSON-LD from the artifact pipeline.
- **Shape:** checked exercises (result-set comparison against a canonical solution),
  not run-and-explore. No free scratchpad in MVP.
- **Engine:** `sql.js` (SQLite → WASM), not DuckDB-WASM (~10× weight for features we
  don't need; SQLite ≥ 3.25 covers window functions and CTEs).
- **Dataset:** small synthetic healthcare schema (rhymes with the Epic/healthcare
  positioning). Deterministic, committed to the repo — never generated at runtime.
- **Scope cap:** 4 sections, 11 exercises. This is the last site feature before
  job-search work takes priority; resist content creep.

## Artifact Metadata

New entry in `lib/learn/artifacts.ts` (drives everything downstream):

```ts
{
  slug: 'sql',
  title: 'SQL / Querying Data',
  shortTitle: 'SQL',
  description: 'Run real SQL against a synthetic patient dataset — SQLite compiled to WebAssembly, with checked exercises from SELECT to window functions.',
  number: '08',
  subtopics: ['SELECT & filtering', 'Aggregation', 'Joins', 'Window functions'],
  sectionCount: 4,
  sections: [
    { id: 'sql-select', label: 'SELECT' },
    { id: 'sql-aggregate', label: 'Aggregation' },
    { id: 'sql-joins', label: 'Joins' },
    { id: 'sql-windows', label: 'Windows' },
  ],
}
```

(Rail labels are ≤ 13 chars per the SectionRail constraint. `TEASER_SLUGS` on the
homepage stays unchanged. "Explore all N" and the sitemap update automatically.)

## Files

| File | Change |
|---|---|
| `components/learn/sql.tsx` | New client component, exports `SQL`. Self-contains its UI helpers (InsightBox-style boxes, buttons) like every other artifact file. |
| `components/learn/dynamic-artifacts.tsx` | Add `SQL` with `ssr: false` (WASM init is client-only). |
| `lib/learn/sql-seed.ts` | Committed, deterministic schema DDL + INSERT statements (see Dataset). |
| `lib/learn/sql-exercises.ts` | Exercise definitions: `{ id, section, prompt, hint, solution, ordered, tables }`. |
| `public/sql-wasm.wasm` | Copied from `node_modules/sql.js/dist/sql-wasm.wasm`, committed. Note in CLAUDE.md: re-copy when bumping the `sql.js` dependency. |
| `lib/learn/artifacts.ts` | Entry above. |
| `app/learn/[slug]/page.tsx` | Component map entry. |
| `app/learn/page.tsx` | `SQLIllustration` for the index card (two-tables-joining motif, existing 80×64 style, draw-stroke/spark-bar instrumented like the others). |
| `app/learn/[slug]/opengraph-image.tsx` | `case 'sql'` illustration (same motif, Mocha hardcoded). |
| `netlify.toml` | CSP + cache changes (see Engine). |
| `package.json` | New dependency: `sql.js` (^1.x, MIT). The **one deliberate exception** to the no-dependencies ethos — you can't hand-roll a SQL engine. Document in CLAUDE.md. |
| `CLAUDE.md` | Tech stack (dependency exception), Key Patterns (runnable artifact + wasm hosting + CSP note), file structure. |

## Engine Integration

- Lazy: `sql.js` is imported only inside `components/learn/sql.tsx`, which is loaded
  via `next/dynamic` on `/learn/sql` only. **Zero bytes on every other route** (verify
  in the network tab).
- Init: `initSqlJs({ locateFile: () => '/sql-wasm.wasm' })`. Build the seed database
  once, cache `seedDb.export()` (Uint8Array) in a module ref.
- **Fresh DB per run:** every Run creates `new SQL.Database(seedBuffer)`, executes,
  closes. Users can type destructive statements without breaking anything; every
  exercise starts from clean state; no cross-exercise leakage.
- Loading state: annotation-styled "loading engine — ~1.2 MB" with `role="status"`.
  Load failure → in-artifact editorial fallback with a "Try again" button (matching
  the ArtifactErrorBoundary styling) — do **not** let init failures throw to the
  boundary.
- **CSP (netlify.toml):** add `'wasm-unsafe-eval'` to `script-src`. Current value:
  `script-src 'self' 'sha256-FzZqltVqNEMe1AP7MNJyYU92WT6Smm3z6p9+mEkOLu0='`
  becomes
  `script-src 'self' 'wasm-unsafe-eval' 'sha256-FzZqltVqNEMe1AP7MNJyYU92WT6Smm3z6p9+mEkOLu0='`.
  Add a headers block for `/sql-wasm.wasm` with `Cache-Control = "public, max-age=86400"`.
  **Note:** Netlify headers don't apply to `npm run dev`/`next start`, so the CSP
  interaction can only be fully verified on a Netlify deploy preview — record this
  as a deploy-time checklist item, don't block on it.
- **Accepted risk (MVP):** queries run synchronously on the main thread; a deliberate
  runaway (e.g. unbounded recursive CTE) freezes the user's own tab. Worker isolation
  is deferred hardening. Guided exercises make this unlikely.

## Dataset (`lib/learn/sql-seed.ts`)

Synthetic, obviously fake, deterministic (authored/generated once, committed — never
runtime-random, so expected results can't drift). Dates within 2024–2026.

- `patients` (~50): `patient_id, name, sex, birth_date, city`
- `encounters` (~200): `encounter_id, patient_id, dept, admit_date, discharge_date`
  — depts: Emergency, Cardiology, Endocrinology, Oncology, Orthopedics, Family Medicine
- `labs` (~600): `lab_id, encounter_id, test_name, value, unit, taken_at`
  — tests: HbA1c, LDL, Glucose, Creatinine, Hemoglobin
- `medications` (~120): `med_id, patient_id, drug_name, start_date, end_date`

Include a few deliberate teaching shapes: patients with **zero** encounters (LEFT JOIN
exercise), patients with many encounters (fan-out exercise), multiple HbA1c results
per patient over time (latest-per-group exercise).

## Exercise Component

One shared client component rendered ~11 times. Anatomy, top to bottom:

1. **Prompt** — the task in plain language, plus a mono annotation listing the
   relevant tables.
2. **Editor** — hand-rolled `<textarea>` (mono font, cream-dark/night-card background,
   border tokens; **no CodeMirror/Monaco** per the no-component-libraries convention).
   Ctrl/Cmd+Enter runs; a visible "⌘↩ to run" annotation (not SR-only). Do **not**
   hijack Tab for indentation — Tab must move focus (no keyboard trap).
3. **Run button** — `btn-lift` styling.
4. **Results** — semantic `<table>` inside `overflow-x-auto`, sr-only `<caption>`,
   visible "n rows" annotation. Cap display at 50 rows with a "showing 50 of n" note.
   A statement returning no result set (e.g. UPDATE) shows "query returned no result
   set" rather than an empty state.
5. **Check outcome** — peach ✓ "matches expected" on pass; on mismatch keep the
   user's result visible with a "Show expected" toggle. Hint button (reveals `hint`),
   then "Reveal solution" as the last resort. SQLite errors render inline.
6. **Live region** — one `aria-live="polite"` container announces run/check outcomes
   and errors ("Correct — result matches expected" / "Doesn't match — 12 rows vs 8
   expected" / the error message).

**Checking semantics** (run user SQL and `solution` against separate fresh DBs, take
the last result set of each):

- Compare column **count** (not names — aliases must not fail a correct query).
- Compare row count, then row-by-row, column-by-column **by position**.
- Normalize values: numbers compared with 1e-9 tolerance; strings trimmed; NULL ≡ NULL.
- `ordered: false` (default): canonically sort both result sets (stringified rows)
  before comparing. `ordered: true` (exercises that demand ORDER BY): compare as-is.

## Sections & Canonical Exercises (11)

**1. `sql-select` — SELECT, WHERE, ORDER BY** (teach: projection, filtering, sorting, DISTINCT)
   1. Names and birth dates of patients in a given city, ordered by birth date.
   2. Patients matching a compound filter (e.g. sex + born after 1980).
   3. `DISTINCT` departments that appear in encounters.

**2. `sql-aggregate` — GROUP BY / HAVING** (teach: aggregation vs filtering, HAVING vs WHERE)
   4. Encounter count per department, descending.
   5. Average length of stay per department (`julianday(discharge) - julianday(admit)`), `HAVING` above a threshold.
   6. Patients with more than 3 encounters.

**3. `sql-joins` — Joins & the fan-out trap** (teach: INNER vs LEFT, NULL rows, row multiplication)
   7. INNER JOIN: patient names with their encounter departments.
   8. LEFT JOIN: **all** patients with their encounter count, including zero
      (`COUNT(e.encounter_id)`, not `COUNT(*)` — the classic gotcha).
   9. Fan-out: join patients → encounters → labs, observe the row explosion, fix with
      a pre-aggregated CTE or `COUNT(DISTINCT …)`. (Prompt walks both steps.)

**4. `sql-windows` — Window functions** (teach: OVER, PARTITION BY, frame vs GROUP BY)
   10. `ROW_NUMBER()` per patient ordering encounters by admit date.
   11. Latest HbA1c per patient (`ROW_NUMBER() OVER (PARTITION BY … ORDER BY taken_at DESC)` filtered to 1 — the #1 analyst interview pattern).

Section headers stay centered per artifact convention (mono `NN/` number + display h2
with the `sql-*` id + short intro paragraph). Each section gets one InsightBox-style
takeaway. Exercise prompts may be tuned in wording but the topics and count are fixed.

## Accessibility & Conventions

- WCAG AA: prose in `text-ink-subtle`, minimum 12px text, tokens for both themes.
- Keyboard: textarea/buttons natively focusable; global focus ring applies; no Tab
  trapping; Ctrl/Cmd+Enter documented visibly.
- `aria-labelledby` per section (existing pattern); editor `aria-label` names its
  exercise.
- 320px: everything inside the artifact's `max-w-5xl px-6` container; results tables
  scroll horizontally inside their own container; no page-level horizontal overflow.
- Reduced motion: nothing here animates beyond existing vocabulary; index-card
  illustration follows the draw-on-reveal pattern (covered by the global override).
- No new visual language — compose annotations, InsightBox, btn-lift, existing tokens.

## Explicitly Deferred (do not build)

Free scratchpad section · localStorage progress · Web Worker query isolation ·
schema diagram · query-plan visualization · difficulty tracks · any R content.

## Verification (audit every claim before reporting)

- `npm run build` succeeds; `npm run lint` shows only the 2 known pre-existing errors
  (interactive-headshot.tsx, masonry-grid.tsx).
- Dev server on port 3100 (if lock error: `pkill -f "next dev" && rm -rf .next/dev/lock`).
- All 11 canonical solutions, entered through the UI, pass their own check.
- A wrong-but-valid query → mismatch UX with "Show expected"; a syntax error → inline
  error via the live region; an UPDATE → "no result set" message.
- Both themes, 320px and desktop, reduced-motion emulation, keyboard-only pass
  (Tab order sane, no traps, run via keyboard).
- Rail shows the 4 `sql-*` sections and highlights on scroll; `/learn` shows 8 cards;
  `/learn/sql/opengraph-image` renders a distinct correct card.
- Network tab on `/` and one other artifact confirms `sql-wasm.wasm` and the sql.js
  chunk are **not** fetched outside `/learn/sql`.
- Engine-failure path: block the wasm request in devtools → retry state renders.
- Zero new console errors on `/learn/sql`.
- CSP `'wasm-unsafe-eval'` present in netlify.toml; full CSP behavior is a
  deploy-preview checklist item (Netlify headers don't apply locally).
- Update CLAUDE.md; commit to `feature/design` in logical chunks; never commit
  `lib/work/` (untracked scratch for a separate task).
