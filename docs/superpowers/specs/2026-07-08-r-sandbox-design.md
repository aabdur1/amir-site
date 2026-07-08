# R Sandbox Learn Artifact (10/) — Design

**Date:** 2026-07-08
**Status:** Approved (brainstorming complete; next step: implementation plan)

## Goal

Add a third interactive code sandbox to /learn: **10/ R** — dplyr on the same
healthcare dataset as 08/ SQL and 09/ Python, completing a "one analysis,
three languages" trilogy. Same 19-exercise arc (filter → group → join →
window → challenges), table-only results, click-gated engine load, checked
exercises with persistent progress.

## Decisions (with rationale)

| Decision | Choice | Why |
|---|---|---|
| Content arc | Mirror SQL/Python: 19 dplyr exercises on the shared healthcare data | Trilogy value (SQL ↔ pandas ↔ dplyr mappings explicit); exercise/checker design ports directly |
| Plotting | None — table-only results | Direct checker port, smaller download, shippable scope; ggplot2 is a possible later addition |
| Engine | webR 0.6.0 (R 4.6.0), the only maintained embeddable R-in-WASM as of mid-2026 | Quarto Live / Shinylive are built *on* webR; xeus-r targets JupyterLite only |
| Hosting | **Self-host** all engine assets + dplyr packages, first-party | Zero CSP changes (see below), no third-party runtime bytes, matches the sql.js vendoring precedent; the rejected alternative (CDN load from webr.r-wasm.org) requires route-scoped `'unsafe-eval'` and has a silent-hang failure mode |
| Communication channel | PostMessage (explicit `channelType`) | Site cannot set COOP/COEP (would break CloudFront/Credly images). PostMessage loses only interruption of running code — parity with the existing main-thread sandboxes |
| dplyr delivery | Mirror the 15-package closure (~6.8 MB) into `public/webr/repo/`, CRAN layout, `repoUrl` pointed there; `installPackages(['dplyr'])` at engine init | Fully first-party at runtime — stronger than 09/, which fetches jsDelivr post-click |

## Load-bearing research facts (measured 2026-07-08 unless cited)

- webR 0.6.0 released 2026-05-19; npm package `webr` (loader is MIT; distribution binaries GPL-3; R itself GPL-2|3).
- Cold init transfer: **~14.3 MB gzip** (R.wasm dominates at 12.3 MB gz). dplyr + closure: **15 packages, ~6.8 MB**, prebuilt for R 4.6 on repo.r-wasm.org (dplyr 1.2.1). Click-gate label: **"Load R — ~21 MB"**.
- R always runs in a **dedicated Web Worker** (page thread stays free — a UX upgrade over sql.js/Pyodide main-thread runs).
- **CSP (empirically bisected, Chrome 150, enforced headers):**
  - CDN-loaded (cross-origin baseUrl): worker spawns from a Blob URL → inherits page CSP → needs `script-src 'unsafe-eval'` (NOT just `'wasm-unsafe-eval'` — webR's Emscripten MAIN_MODULE loader `eval()`s EM_JS stubs at dlopen). Missing it = `init()` hangs forever with no rejection and no console violation.
  - **Same-origin (self-hosted): works under the site's exact current CSP with zero changes** — a same-origin classic worker takes CSP from its own response headers, not the page's. Chrome-verified; Firefox/Safari verification is a ship-gate.
- Key APIs: `WebR` class (`init`, `evalR`, `installPackages`, `FS`, `WebROptions.baseUrl/repoUrl/channelType`); `Shelter.captureR(code)` → `{ result, output: [{type: stdout|stderr|message|warning|error, data}], images }`; data.frame → JS via `RObject.toD3()` (array of row objects).
- npm `webr` dist gotcha: its `webr.mjs` is the bundler build (fails direct browser import; fine for Next bundling). Whether npm's worker/wasm files are browser-ready is **unresolved** — see Open Items.
- Safari has open webR issues (#189 assertion error, #479 canvas plotting). Canvas one is irrelevant (table-only); general Safari/iOS operation is a ship-gate with graceful degradation.

## Architecture

### Asset pipeline

- `package.json`: `"webr": "0.6.0"` (exact pin). Loader imported only inside the R artifact's ssr:false chunk — zero webR JS on other routes.
- **`scripts/fetch-webr.mjs`** populates `public/webr/` (gitignored, never committed):
  - `public/webr/0.6.0/` — runtime subset (~45 MB): `webr-worker.js`, `R.js`, `R.wasm`, `libRblas.so`, `libRlapack.so`, `vfs/` tree (lazy filesystem). Version in the path ⇒ immutable caching is safe.
  - `public/webr/repo/` — dplyr closure mirror in CRAN layout (`bin/emscripten/contrib/4.6/PACKAGES` + 15 `.tgz`), pinned URLs + sha256 checksums.
  - Source preference: copy from `node_modules/webr/dist` if browser-ready (no network, loader/binaries version-locked); else download the pinned GitHub release tarball with sha256 verification. Resolved during implementation (Open Items).
  - Idempotent (skips when checksums match); wired as `prebuild`; run once manually for dev.
- `netlify.toml`: 1-year immutable cache header for `/webr/*`.

### CSP

- **No page-level CSP changes.** The generic policy in `next.config.ts` stays untouched; no new origins anywhere.
- **Dev/prod worker-header gotcha, pre-empted:** on Netlify, `public/webr/*` is CDN-served and gets no next.config CSP (worker runs unconstrained — the verified-good state). Under `next dev`/`next start`, the `/(.*)`  block WOULD attach the page CSP to the worker script's own response and strangle it (dev-only silent hang). Fix: a `/webr/:path*` headers() entry after the generic block (last-match-wins, established pattern) issuing `script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'` on those **asset responses only** — governs the worker's execution context, never a page.
- Restart the dev server after the headers() change (documented stale-headers gotcha).

### Licensing

- Vendored `R.wasm` etc. are GPL-3 object code; conveying them requires source access — attribution note in the artifact footer linking the webR 0.6.0 release/source (GPLv3 §6(d) practice). Site code unaffected (loader API is MIT; site JS only messages the worker). Not legal advice; standard practice for unmodified upstream binaries.

## Component design

### `components/learn/r.tsx` (10/)

Ports the `python.tsx` structure: `'use client'`, loaded via
`dynamic-artifacts.tsx` with `ssr: false`. Module-level engine singleton.

- **Click-gate:** "Load R — ~21 MB". Staged progress on the button: *loading R → installing dplyr → preparing data*. Zero `/webr/*` bytes on any route before the click.
- **Init sequence:** `new WebR({ baseUrl: '/webr/0.6.0/', repoUrl: '/webr/repo/', channelType: PostMessage })` → `init()` → `installPackages(['dplyr'])` → write CSVs into the VFS → eval the setup + checker harness (one R string, the `SETUP_CODE` pattern).
- **Data:** imports `PY_CSV` from `lib/learn/python-data.ts` — byte-identical dataset across 08/09/10, no third generated file. Setup `read.csv` uses explicit `colClasses` + Date parsing so types match the pandas frames.
- **Fresh env per run:** user code evals in a `new.env()` seeded with the four data.frames. Copy-on-modify isolates the masters; data.table (the by-reference mutator) is never loaded.
- **Worker execution:** page stays responsive during runs; "Running…" state is real.
- **Results UI:** `RObject.toD3()` row objects → the 09/ result-table component pattern; 50-row display cap; date formatting and italic NA as in 09/; captured stdout/stderr rendered above the table.
- **Progress:** localStorage `r-progress-v1`, lazy useState initializer (safe under ssr:false), peach ✓ chips, "N of 19 solved", reset button.

### `lib/learn/r-exercises.ts`

19 exercises mirroring the SQL/pandas arc one-for-one. Sections:
`r-filter / r-group / r-join / r-window / r-challenge`. Shape mirrors
`PyExercise`: `{ id, section, prompt, hint, solution, resultType: 'dataframe' | 'vector' | 'scalar', ordered, tables }`.

- Contract: every prompt ends **"Assign your answer to result."**
- Canonical solutions in dplyr (`filter`/`arrange`, `group_by` + `summarise`, `left_join`/`inner_join`, `mutate` + `min_rank`/`row_number`/`lag`). Base-R answers pass — the checker only inspects `result`.
- Hints carry the trilogy: contrast with the pandas/SQL idiom (e.g. "`is.na()`, not `== NA` — the same trap as NaN in pandas").

### Checker (R harness, eval'd once at init)

Runs user code and canonical solution in **separate fresh environments**;
compares the two `result`s with sql-check semantics:

- Column **count** (names/aliases free), then row count, then positional cells.
- Canonical row sort unless `ordered: true`.
- Numerics: atol 1e-9. `NA ≡ NA`. Strings trimmed. Dates compared as Dates.
- Tibbles and data.frames both accepted (`as.data.frame` coercion). Atomic vector = one-column result (Series analog). `scalar` compares one value with tolerance.
- **Simplification vs 09/:** R has no index — grouped summaries already carry keys as columns, so the `reset_index()` dual-candidate mechanism is dropped entirely.
- Contract violations reported in the established voice ("result should be a data.frame or vector, got function").

### Wiring

- `lib/learn/artifacts.ts`: slug `r`, order 10, 5 sections with rail ids `r-*` (labels ≤ 13 chars); h2s carry stable ids. Index card, prev/next, SectionRail, sitemap, per-slug OG image, JSON-LD derive automatically.
- Hand-drawn index-card illustration in `app/learn/page.tsx` (draw-stroke conventions).
- CLAUDE.md: new "R sandbox artifact (10/)" pattern entry + file-structure/tech-stack updates.

## Error handling

- **Engine-load failure** → in-artifact fallback panel with "Try again" (page reload; init treated as non-re-enterable, like 09/). Never throws to `ArtifactErrorBoundary`.
- **Load watchdog (new vs 09/):** webR's characteristic failure is a hang, not a rejection. Init races a ~60s timeout → fallback panel ("still couldn't start R"), so a dead worker can't leave the button spinning.
- **User-code errors** render inline: R condition message + offending call where available (via `captureR` error output / rethrown JS exceptions) — closest analog to 09/'s type + message + line.

## Verification plan (ship-gates, in order)

1. Fetch-script integrity: sha256 verified on every populate; loud failure.
2. **All 19 canonical solutions pass their own checker** — temporary in-browser dev harness asserts 19/19 (same discipline as the seed generator's assertions).
3. CSP live-verification under `next start` (restart after headers() change): load, run, dplyr install with production headers.
4. **Cross-browser gate:** Firefox + Safari desktop confirm same-origin-worker CSP behavior; iOS Safari smoke test. If Safari fails: graceful "R isn't supported in this browser yet" state via the watchdog, not a hang.
5. Zero-bytes-pre-click audit on `/learn/r` and other routes (network tab), parity with the Pyodide verification.
6. Standard checklist: 320px, keyboard operability, AA contrast (min 12px text), reduced-motion, lint + build clean.

Rollout: feature branch → PR; Netlify deploy preview re-verifies gates 3–5 against real CDN header behavior before merge.

## Out of scope

- ggplot2 / any plotting (possible future addition).
- Interrupting running R code (requires COOP/COEP — unavailable site-wide).
- data.table, tidyverse beyond dplyr.
- Offline/PWA caching of the runtime.

## Open items (resolved during implementation, not blockers)

1. **npm dist vs release tarball** as the binary source for `fetch-webr.mjs`: verify whether `node_modules/webr/dist` worker/wasm files are browser-ready; prefer them, else pinned GitHub release tarball + sha256. (Known quirk: the 0.6.0 release tarball's `webr.mjs` self-reports "0.5.10-dev" — cosmetic.)
2. Exact minimal `vfs/` subset — start with the full lazy tree (~25 MB on disk, fetched on demand only), prune later if measurement shows dead weight.
3. Whether `installPackages` at init or `webr::mount()` of a prebuilt library image is faster for the mirrored dplyr closure — measure; either stays first-party.
