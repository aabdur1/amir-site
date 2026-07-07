# Design: "09/ Python" — In-Browser pandas Practice Sandbox

**Date:** 2026-07-07
**Status:** Approved (Amir, via detailed prompt, 2026-07-07)
**Branch:** `feature/python-sandbox` off main (the prompt's `feature/design` is merged and deleted). Stack commits here; do NOT merge or push to main without Amir's go.
**Execution mode:** lean inline (no subagent-per-task pipeline, no full-code plan doc) — budget-constrained session; the 08/ SQL sandbox (`components/learn/sql.tsx` + `lib/learn/sql-*.ts`) is the working template. Mirror it file-for-file and decision-for-decision unless this spec says otherwise.

## Goal

`/learn/python` artifact (09/): checked pandas exercises against the same synthetic healthcare dataset as the SQL sandbox, running Pyodide in-browser. Same architecture, UX, design bar, and pipeline auto-pickup (rail, tab bar, index card, per-slug OG, sitemap, JSON-LD, teaser count) as 08/. Python/pandas ONLY.

## Locked decisions

### Engine — Pyodide from CDN
- **Pinned version** from the official jsDelivr CDN (`https://cdn.jsdelivr.net/pyodide/vX.Y.Z/full/`) — verify the latest stable 0.28.x at implementation time and pin it in one constant. Load `pyodide.js` (or dynamic import of the mjs) + `await pyodide.loadPackage('pandas')`. Do NOT commit the runtime.
- **Click-to-start gate**: nothing Pyodide-related loads on page mount. A "Load Python — ~N MB" button (measure real transfer size, put the honest number in the copy — the SQL "~0.7 MB" precedent) starts init; `role="status"` + aria-live progress line through the load phases (runtime → pandas → dataset). Zero Pyodide bytes on every other route AND on /learn/python before the click (verify in the network tab both ways).
- **Module singleton** mirroring sql.tsx's `loadEngine()`. Failure → in-artifact editorial fallback; **"Try again" reloads the page** (assume Pyodide's init has the same unresettable-promise class of problem sql.js had — do not build a soft retry). Announce failure in the status line (`engine failed to load` — the SQL artifact's exact pattern).
- **Fresh namespace per Run** (analog of fresh-DB-per-run): master DataFrames built ONCE at init from the dataset module; every Run executes in a fresh globals dict pre-seeded with `pd`, `np`, and **`.copy()`s** of the four frames — user mutations can never leak between runs or exercises.
- **Main-thread execution accepted** (like SQL): show a "running…" state; Web Worker isolation is deferred hardening. A runaway loop freezes the user's own tab.
- **stdout captured** and shown with the result (students print things).

### CSP (next.config.ts headers() — NOT netlify.toml; see CLAUDE.md Security Headers)
- Route-scoped override: keep the site-wide CSP as-is; add a SECOND headers() entry with `source: '/learn/python'` whose CSP additionally allows `https://cdn.jsdelivr.net` in `script-src` and `connect-src`. Next.js applies the last matching source's value for a duplicate key, so order the generic `'/(.*)'` rule first.
- `'wasm-unsafe-eval'` is already present. If (and only if) local testing under `next start` shows Pyodide violations demanding `'unsafe-eval'` or `worker-src blob:`, add them to the /learn/python override ONLY and document why. Never loosen the site-wide policy for this.
- **Never add a hash to script-src** (breaks 'unsafe-inline' — see memory/CLAUDE.md).
- Deploy-preview-only check: production /learn/python loads Pyodide from the CDN with zero console CSP violations.

### Dataset — same data as SQL
- Extend `scripts/generate-sql-seed.mjs` to ALSO emit `lib/learn/python-data.ts`: the four tables as CSV strings (`export const PY_CSV = { patients, encounters, labs, medications }` + reuse `SQL_SEED_COUNTS`). Same PRNG stream, same SEED (50), same assertions — one generator, two outputs, zero drift. Determinism check: run twice, no diff (both files).
- Engine init parses them with `pd.read_csv(io.StringIO(...))`, `parse_dates` on the date columns. No fetches, no CSP surface for data.

### Exercises & checking
- **File:** `lib/learn/python-exercises.ts` (sibling naming to sql-exercises.ts, not lib/practice/). Shape, documented in the file header so Amir can append his own:
  `{ id, section, prompt, hint, solution, resultType: 'dataframe' | 'series' | 'scalar', ordered: boolean, tables: string[] }`
- **Contract:** every prompt ends with "assign your answer to `result`". The checker runs the user's code in a fresh namespace, the canonical `solution` in another fresh namespace, and compares the two `result`s in Python.
- **Comparator** (a Python helper string executed at init, mirroring sql-check.ts semantics): DataFrame/Series → `reset_index(drop=True)`, compare by **position not labels** (aliases/renames pass), canonical-sort all rows unless `ordered: true`; numerics via `np.isclose(atol=1e-9, equal_nan=True)` (NaN ≡ NaN); shape mismatches reported as "N rows vs M expected" / "N columns vs M expected"; value mismatches name the position, not the expected value. Scalars → isclose / equality. Missing `result` → "assign your answer to a variable named result". Returns `{pass, reason}` JSON to JS.
- **On mismatch: always show the user's actual output** (their `result` rendered as a table/series/scalar, head-capped like the SQL 50-row cap) plus the "Show expected" toggle — same UX as SQL.
- **10–12 exercises, 4 sections** mirroring the SQL arc so the SQL↔pandas mapping is explicit. Plain clinical-ops phrasing:
  1. `py-filter` — Filtering (2): boolean masks + compound conditions; sort_values (ordered: true analog of ex.01).
  2. `py-groupby` — Group & agg (3): value_counts/size per dept; groupby().agg() avg length-of-stay with threshold filter (HAVING analog); patients with >3 encounters.
  3. `py-merge` — Merging (3): inner merge; left merge + zero-fill counts (COUNT(col) analog — the NaN gotcha); the fan-out trap with double merge, fixed via nunique / pre-aggregation.
  4. `py-window` — Windows (2–3): cumcount/rank per patient by admit_date (ROW_NUMBER analog); latest HbA1c per patient via sort_values + groupby head(1) or idxmax; optionally a cumsum running total.
- Length-of-stay: dates parsed as datetime64 → `(discharge - admit).dt.days` (the julianday analog).
- **Every canonical solution entered through the real UI must pass before reporting done** — and one deliberate wrong answer must show the mismatch + user output path.

### Progress persistence (in scope HERE, unlike SQL)
- localStorage key `python-progress-v1`: array of passed exercise ids. On pass, persist; on mount, hydrate (guard with useEffect — no SSR reads; component is ssr:false anyway). Solved exercises show a peach ✓ chip in their header. A small "reset progress" text button clears it. Survives refresh (part of DoD).

### Artifact metadata (lib/learn/artifacts.ts — drives the whole pipeline)
```ts
{
  slug: 'python',
  title: 'Python / pandas',
  shortTitle: 'Python',
  description: 'Drill pandas in the browser — Pyodide running real Python against the same synthetic patient dataset as the SQL sandbox, with checked exercises from filtering to window ops.',
  number: '09',
  subtopics: ['Filtering', 'GroupBy & agg', 'Merging', 'Window ops'],
  sectionCount: 4,
  sections: [
    { id: 'py-filter', label: 'Filtering' },
    { id: 'py-groupby', label: 'Group & agg' },
    { id: 'py-merge', label: 'Merging' },
    { id: 'py-window', label: 'Windows' },
  ],
}
```
(All rail labels ≤ 13 chars.)

### Files
| File | Change |
|---|---|
| `components/learn/python.tsx` | New client component `Python` — mirror sql.tsx structure (engine module, Exercise, ResultTable-equivalent, sections, fallback). |
| `components/learn/dynamic-artifacts.tsx` | Add `Python`, ssr: false. |
| `lib/learn/python-data.ts` | GENERATED CSV strings (from the extended generator). |
| `lib/learn/python-exercises.ts` | Exercise definitions (shape above, documented header). |
| `scripts/generate-sql-seed.mjs` | Also emits python-data.ts; assertions unchanged. |
| `lib/learn/artifacts.ts` | Entry above. |
| `app/learn/[slug]/page.tsx` | Map entry. |
| `app/learn/page.tsx` | `PythonIllustration` (dataframe motif: stacked row-bands + index column, one accent per band; draw-stroke/spark-bar rules per convention). |
| `app/learn/[slug]/opengraph-image.tsx` | `case 'python'` (same motif, Mocha hexes). |
| `next.config.ts` | /learn/python CSP override (jsDelivr). |
| `CLAUDE.md` | Tech stack (Pyodide CDN exception — runtime NOT committed, unlike sql.js), Key Patterns entry, file tree, Security Headers note, ssr:false list "6 of 8" → "7 of 9". Grep for stale 8/eight counts (sitemap "8 artifact pages", "card grid of 8", teaser is dynamic). |

### Out of scope / unchanged
No changes to the SQL sandbox's behavior. `lib/work/` stays untracked. No Web Worker, no code editor library (hand-rolled textarea, Tab NOT hijacked, Ctrl/Cmd+Enter runs), no matplotlib/plotting, no pip/micropip beyond pandas, no difficulty tracks.

## Verification (audit every claim)
- `npm run build`; `npm run lint` → only the 2 known pre-existing errors.
- Real browser (`next start` for CSP-accurate headers, port 3100): click-to-load init with progress states; all canonical solutions pass via UI; a wrong-but-valid answer shows mismatch + the user's own output; a Python exception renders inline (traceback tail, live region); progress ✓s survive a refresh; failure path (block CDN via devtools or offline) → fallback → Try again reloads and recovers.
- Network tab: zero Pyodide/CDN bytes on `/`, `/learn/sql`, and on `/learn/python` pre-click.
- Both themes, 320px (result tables scroll internally), reduced-motion, keyboard-only.
- Rail/index/OG/teaser show the ninth artifact; sitemap count 9.
- Deploy preview (post-merge, can't verify locally): CDN + wasm under production CSP, zero violations.
