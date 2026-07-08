# amir-site

Personal website for Amir Abdur-Rahim at amirabdurrahim.com. Landing page (hero with CTA/resume links + 6 editorial resume sections) + photography gallery + interactive data mining explainers + /work case studies.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 (CSS-first `@theme` configuration in `app/globals.css`)
- **Lightbox:** yet-another-react-lightbox (gallery EXIF overlay + zoom)
- **SQL engine:** sql.js ^1.14 (SQLite → WASM, MIT) — the one deliberate exception to the no-dependencies ethos (you can't hand-roll a SQL engine). Used only by the 08/ SQL learn artifact.
- **Python engine:** Pyodide 0.29.4 (CPython + pandas → WASM) — NOT an npm dependency and NOT committed (unlike sql.js); fetched at runtime from the pinned jsDelivr CDN, only on /learn/python and only after the user clicks the load button. Used only by the 09/ Python learn artifact.
- **R engine:** webR 0.6.0 (R 4.6.0 + dplyr → WASM, GPL-3 binaries / MIT loader) — loader via the pinned `webr` npm package; runtime binaries + a dplyr/jsonlite package mirror are fetched at build time by `scripts/fetch-webr.mjs` into gitignored `public/webr/` (sha256 lock committed) and served first-party. Loaded only on /learn/r after the user clicks the load button. Used only by the 10/ R learn artifact.
- **Deployment:** Netlify (connected to GitHub repo, `@netlify/plugin-nextjs`)
- **Domain:** amirabdurrahim.com

## Key Conventions

- **No component libraries.** All components are hand-crafted. No shadcn/ui, no Radix, no MUI.
- **CSS-first Tailwind config.** Design tokens live in `app/globals.css` via `@theme {}`, not in a JS config file.
- **Fonts via next/font/google.** DM Serif Display (headings), DM Sans (body), Share Tech Mono (mono/tags), Lora (credential badges). Loaded as CSS variables (`--font-display`, `--font-body`, `--font-mono`, `--font-badge`) in `app/layout.tsx`.
- **Dark mode via class toggle.** Uses `.dark` class on `<html>`. Custom variant defined in globals.css: `@custom-variant dark (&:where(.dark, .dark *));`. Blocking inline `<script>` in `layout.tsx` prevents flash of wrong theme on load. Toggle uses View Transitions API (`startViewTransition`) with circular clip-path reveal when supported, falling back to `.theme-transitioning` class for 300ms crossfade.
- **No icon libraries.** Icons are inline SVGs.
- **Client components marked explicitly.** Components using `"use client"`: nav, dark-mode-toggle, hero, animated-text, living-field, spine, count-up, interactive-headshot, certifications, experience, projects, featured-project, skills, education, footer, scroll-progress, page-transition, learn-teaser. Gallery components (masonry-grid, photo-card, sort-controls) are also client components. Learn components (learn-card, section-rail, gradient-descent, log-loss-cross-entropy, pca, regularization, clustering, shap, neural-networks, sql, python, r, table-chips) are client components. learn-nav, section-header, section-divider, and spark-rule are server components.
- **No shorthand/longhand mixing in inline styles.** Always fold `animationDelay` into the `animation` shorthand to avoid React warnings.

## Key Patterns

- **Shared hooks in `lib/hooks.ts`.** `useHydrated()` (hydration-safe boolean via `useSyncExternalStore`), `useScrollReveal()` (IntersectionObserver with threshold 0.1, disconnect-after-first-intersection, returns `[ref, visible]`), and `useMagnetic()` (RAF + lerp cursor pull, 4px max, `(pointer: fine)` gated — used by nav pills and hero CTAs).
- **Living Ledger design language.** The site-wide visual system: ruled "analyst's journal" structure + live data-plot accents. Vocabulary lives in `globals.css` (`.annotation` mono captions, `.draw-stroke`/`.spark-bar` self-drawing strokes, `.tick-line`/`.tick-dot` header ticks, `.reg-mark` registration corners) and shared components (`SparkRule`, `SectionHeader`, `Spine`, `LivingField`, `CountUp`). New pages should compose these rather than styling one-off. All drawn/animated pieces render fully-drawn static under `prefers-reduced-motion` via the CSS block at the end of globals.css.
- **Shared components.** `SectionDivider` (server, diamond ornament with `color` and `absolute` props). `SectionHeader` (server): ledger rail header — tick hairline draws toward the numbered mono label, peach dot commits with a spring; props `align` ('left'|'right', sections alternate at sm+, all left below sm), `annotation` (ReactNode mono caption with real numbers, e.g. "fig. 02 · n = 7 builds"), `spark` ({data, variant}); falls back to the classic static mauve rule without `spark`; keeps the `id="section-{number}"` aria contract. `SparkRule` (server): self-drawing SVG data stroke, variants 'line'/'step'/'bars' (bars measure from zero baseline so equal values stay visible), draws on `visible` via `.draw-stroke`/`.is-drawn`. `CountUp` (client): shared count-up numeral (animated span aria-hidden + sr-only real value), used by gallery count and section annotations.
- **LivingField (site-wide data field).** `components/living-field.tsx`, mounted once in `layout.tsx`: a fixed full-viewport canvas of plot-like points (~82% dots, ~18% "+" ticks, ≤3 faint mono value labels using the stack resolved from `--font-mono` at runtime) in both themes. Seeded PRNG; assembles from noise into a rising trend band on load; per-point scroll parallax (depth-scaled, wrapping) disperses the structure as you scroll; slow drift + cursor repel (fine pointers). Dark mode renders smaller crisp single points (~0.55× size, no halo, lower alpha); light mode keeps larger dots. 30fps cap; pauses when tab hidden AND after 12s without pointer/scroll/touch/key activity (wakes instantly on any interaction, never pauses before the entry assembly finishes) — measured: the always-on loop cost ~5% of a core idle, the pause reduces it to ~0. Static assembled frame under reduced motion; hardcoded Latte/Mocha palettes (learn-artifact pattern). Route intensity via `routeProfile()`: full on `/`, medium on `/learn`, faint elsewhere (gallery/artifacts/404) — add an entry when creating a new top-level route.
- **SectionRail (artifact section nav).** `components/learn/section-rail.tsx`, rendered inside the relative `<article>` on `/learn/[slug]`: sticky ledger-style nav in the left margin at xl+ only (`left: 0; width: calc((100vw - 64rem)/2 - 1.5rem)`, content right-aligned — same clearance approach as the Spine; hidden below xl). Labeled ticks (12px mono; labels ≤ 13 chars so they fit the margin at exactly 1280px) link to each section; IntersectionObserver (`rootMargin: '-15% 0px -60% 0px'`, first in-band section in reading order wins) highlights the current one — mauve label, longer tick, peach commit dot, `aria-current="location"`. A MutationObserver retries target lookup because artifacts mount late (code-split, several ssr:false). Click smooth-scrolls unless `prefers-reduced-motion` (then instant jump). Targets come from the `sections` array in `lib/learn/artifacts.ts`; every artifact h2 carries a stable id (`gd-*`, `ll-*`, `pca-*`, `reg-*`, `cl-*`, `shap-*`, `nn-section-N`) and a globals.css rule gives `section[aria-labelledby] h2[id]` `scroll-margin-top: 5.5rem` so anchors land clear of the sticky nav. Adding a section to an artifact: give its h2 an id and add `{ id, label }` to the artifact's `sections` array.
- **Spine (homepage scroll axis).** `components/spine.tsx`, rendered inside the homepage's relative wrapper in `page.tsx`: full-height hairline in the left margin (xl+ only, `left: calc((100vw - 64rem)/2 - 3rem)` so it never collides with content), peach→mauve gradient stroke scaleY-driven by scroll progress with a peach pen-tip dot. RAF-gated ref mutations; fully drawn static under reduced motion. Replaced the old hero-only `hero-line`.
- **Shared accent styles in `lib/styles.ts`.** Unified `ACCENT_STYLES` map (sapphire, mauve, peach, lavender, rosewater) with `bg`, `border`, `hoverBorder`, `dot`, `text` classes. Used by hero badges, skills pills, project cards, and the featured Theli card. Projects extends with local `STRIPE_STYLES` for top border color (includes rosewater).
- **`next/image` for optimized images.** Headshot uses `fill` + `priority` (LCP element), badges use explicit `width/height`. Gallery grid images are fully optimized: `photo.thumb` (1600px source thumbnails via CloudFront `/thumbs/`) goes through the Next optimizer (Netlify Image CDN in production) with `sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"` — measured ~85% smaller than the raw thumb at a 400px cell. Lightbox uses full-resolution `photo.url` directly. Remote patterns configured in `next.config.ts` for CloudFront and Credly domains, AND CloudFront is explicitly allowlisted in `netlify.toml` `[images] remote_images` (required for the Netlify Image CDN to fetch remote sources; a miss here breaks images only in production).
- **Gallery thumbnail + BlurHash pipeline.** `scripts/add-photo.mjs` handles the full workflow: uploads original to S3, generates 1600px mozjpeg thumbnail via `sharp` (q80, `withoutEnlargement`), computes 4x3 BlurHash from thumbnail, uploads thumbnail to S3 `/thumbs/`, updates `photos.json` with url, thumb, blurhash, date, camera, lens. Supports batch: `node scripts/add-photo.mjs photo1.jpg photo2.jpg`. Auto-detects date from filename (`YYYYMMDD-` prefix), guesses camera/lens from filename prefix (DSCF→X100VI, DSC0→ILCE-6700, _DSC→ILCE-6300). `scripts/add-photo-gui.mjs` opens a native macOS Finder picker via `osascript`, passes selections to `add-photo.mjs`. `scripts/generate-thumbnails.mjs` batch-generates thumbnails. `scripts/generate-blurhash.mjs` batch-generates BlurHash strings. Thumbnails are ~250KB vs ~10MB originals (97-99% reduction).
- **Gallery sort and shuffle.** Four sort modes: `'date'` (default, newest first), `'camera'`, `'lens'`, `'shuffle'` (Fisher-Yates). Shuffle re-randomizes each time selected. Sort resets visible count to batch size (12). Sort controls in `sort-controls.tsx` with ARIA menu pattern.
- **Gallery progressive loading.** Only 12 photos render initially (`BATCH_SIZE`). IntersectionObserver on a sentinel div with `rootMargin: '400px'` triggers loading of the next 12 as the user scrolls. Prevents mounting 50+ Image components at once.
- **Gallery CSS Grid with varied sizes.** Uses `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-[250px] sm:auto-rows-[300px]`. Portrait photos (detected via `naturalHeight > naturalWidth` on load) get `row-span-2`. The `row-span-2` class only applies after `entryDone` to prevent layout shift during the entry animation.
- **Gallery BlurHash placeholders.** Each photo has a `blurhash` string in `photos.json` (4x3 components, ~25 chars). On mount, the BlurHash is decoded into a 32x32 canvas that shows instantly as a colorful placeholder. Fades out when the actual image loads. Uses the `blurhash` npm package for decode.
- **Gallery clip-path reveal.** Cards enter with a `clip-reveal` CSS keyframe animation — image wipes into view from top to bottom over 800ms with expo-out easing, staggered at `(index % 6) * 80ms`. Before viewport entry, cards are `opacity: 0`. After `entryDone`, inline styles are cleared.
- **Gallery parallax.** Each photo card has a `will-change-transform` wrapper inside `overflow-hidden`. RAF-gated scroll listener applies `scale(1.08) translateY(offset)` based on card distance from viewport center (`FACTOR = 0.15`). Works on both desktop and mobile. Respects `prefers-reduced-motion`.
- **Gallery lightbox with View Transition morph.** Clicking a photo sets `view-transition-name: gallery-photo` on the image wrapper, then `document.startViewTransition()` triggers the lightbox open. CSS `gallery-morph-in` keyframe scales from 0.8x/opacity 0 to 1x/opacity 1 over 0.4s. Falls back to instant open on unsupported browsers. Lightbox index uses URL-based lookup (`photoIndexByUrl`) to handle infinite scroll correctly.
- **Gallery image loading.** BlurHash canvas placeholder shows instantly, actual image loads behind it, BlurHash fades out on load complete. No CSS blur filter needed — BlurHash provides real color data from the image.
- **Branded OG images.** `app/opengraph-image.tsx`, `app/gallery/opengraph-image.tsx`, and `app/learn/opengraph-image.tsx` generate 1200x630 PNGs at build time using `ImageResponse` from `next/og`. Catppuccin Mocha branding with DM Serif Display font loaded from Google Fonts gstatic (with try/catch fallback if font fetch fails). No hardcoded `images` in metadata — Next.js auto-injects from these routes. `app/learn/[slug]/opengraph-image.tsx` renders a unique per-slug card (number, title, subtopics, the index-card illustration with Mocha colors hardcoded), served on demand (the route is ƒ dynamic). Satori gotchas learned there: JSX interpolation that yields multiple text-node children (e.g. `{number}/`) fails with "Expected <div> to have explicit display: flex" — fold into a single template string; the ◆ glyph triggers a runtime font-fallback fetch that can fail, so ornaments in all OG routes are drawn (rotated square div) instead.
- **Metadata-driven learn section.** `lib/learn/artifacts.ts` is the single source of truth for all artifact metadata (slug, title, description, subtopics, section count, and `sections` — the `{ id, label }` list driving the SectionRail). The index page, prev/next nav, section rail, per-slug OG image, sitemap entries, and JSON-LD `LearningResource`/`BreadcrumbList` schemas all derive from this array. Adding a new artifact: create the component (with stable ids on its section h2s), add an entry to the array.
- **Metadata-driven /work case studies.** `lib/work/case-studies.ts` mirrors the learn architecture: one array drives the /work index (WorkCard grid), /work/[slug] pages (rendered data-only by `components/work/case-study-article.tsx` — title block, metric stat tiles, optional paired bars, numbered prose sections, outbound links), prev/next (`WorkNav`, rendered only when a neighbor exists — the single-entry case shows nothing), sitemap entries, per-slug OG card, and JSON-LD `CreativeWork`/`BreadcrumbList`. A section with `embed: true` renders the study's `embed` (Tableau) under its paragraphs. Six unverified draft studies are quarantined in `lib/work/unpublished-drafts.ts` (imported by nothing; verify numbers, move into CASE_STUDIES, renumber to publish). Discovery: homepage Projects card (internal `Link` variant — `url` starting with `/` renders a next/link without target=_blank) + footer Work link; deliberately NO third nav pill (320px nav balance).
- **Tableau embed (click-gated iframe).** `components/work/tableau-embed.tsx`: the case study's Tableau Public story loads as a plain iframe ONLY after "Load the interactive story" is clicked — zero tableau.com bytes anywhere before that, and zero third-party JS ever (the Embedding API was deliberately skipped: unpinned `*.latest.min.js` + it would widen script-src; the iframe needs only frame-src). Author-set story size is data-driven (`embed.width/height` — 1016×991 for the airline story, verified against the live `#tab-dashboard-region` 1016×964 + 27px bottom strip); on narrow screens the frame pans inside its own `overflow-x-auto` wrapper so the page never scrolls horizontally. On-design placeholder (three-view SVG motif) + `role="status"` copy before/after load.
- **Learn artifact error boundary.** `ArtifactErrorBoundary` class component wraps each artifact in `app/learn/[slug]/page.tsx`. Shows editorial-styled fallback with "Try again" button if a canvas/interaction throws.
- **Learn artifacts with ssr: false.** 8 of 10 learn artifacts load with `ssr: false` — five (Log Loss, PCA, Clustering, SHAP, Neural Networks) use `Math.random()` in `useState` initializers or ref initializers; SQL and Python because their WASM engines are client-only; R because its webR engine is client-only. They're loaded via `components/learn/dynamic-artifacts.tsx` — a `'use client'` wrapper that re-exports them with `next/dynamic` `{ ssr: false }` to avoid hydration mismatches. Gradient Descent and Regularization use deterministic initial data and load with SSR.
- **SQL sandbox artifact (08/).** `components/learn/sql.tsx`: sql.js is imported only here (ssr: false chunk → zero bytes outside `/learn/sql`); wasm served from `public/sql-wasm.wasm` — **re-copy from `node_modules/sql.js/dist/sql-wasm.wasm` when bumping the sql.js dependency**. Engine is a module singleton: seed DB built once from `lib/learn/sql-seed.ts`, `db.export()` buffer cached, **fresh `Database(seedBuffer)` per Run** (destructive statements can't leak; accepted MVP risk: queries run on the main thread). Seed data is generated by `scripts/generate-sql-seed.mjs` (deterministic LCG, committed output, in-script assertions enforce the teaching shapes — zero-encounter patients, tie-free ORDER BY / ROW_NUMBER columns, HbA1c series). Exercises in `lib/learn/sql-exercises.ts` are checked by `lib/learn/sql-check.ts`: column *count* (aliases pass), then positional cells — numbers 1e-9 tolerance, strings trimmed, NULL ≡ NULL, canonical row sort unless `ordered: true`. Engine-load failure renders an in-artifact fallback with retry (never throws to the ArtifactErrorBoundary). CSP needs `'wasm-unsafe-eval'` (next.config.ts `headers()`; verified live).
- **Python sandbox artifact (09/).** `components/learn/python.tsx`: Pyodide pinned at 0.29.4 from jsDelivr (`PYODIDE_CDN` constant — the runtime is NOT committed), loaded ONLY after the user clicks "Load Python — ~13 MB" (measured gzip transfer for runtime + pandas/NumPy wheels; zero CDN bytes pre-click on every route, verified). Engine is a module singleton mirroring sql.tsx: master DataFrames built once from `lib/learn/python-data.ts` CSVs — generated by the SAME `scripts/generate-sql-seed.mjs` run as the SQL seed (same PRNG stream and SEED, so 08/ and 09/ drill identical data; the CSV block adds zero extra PRNG calls, keeping sql-seed.ts byte-identical). Every Run exec's the user's code in a fresh namespace pre-seeded with `pd`, `np`, and `.copy()`s of the four frames (mutations can't leak between runs; main-thread execution accepted like SQL — a "Running…" state paints via setTimeout before the block). Exercises in `lib/learn/python-exercises.ts` (contract: every prompt ends "Assign your answer to result"); the checker — a Python harness string exec'd at init — runs user + canonical solution in separate fresh namespaces and compares `result`s positionally, mirroring sql-check semantics (column count then cells, aliases/renames pass, canonical row sort unless `ordered: true`, numeric atol 1e-9, NaN/NaT ≡ themselves), PLUS a `reset_index()` candidate so groupby/value_counts results with keys in the index pass against reset solutions; on failure the reported reason matches whichever form the user's rendered table shows. stdout is captured (redirect_stdout) and rendered; exceptions render inline as type + message + user-code line number. Result tables cap display at 50 rows in Python (`_HEAD`); non-midnight Timestamps render `YYYY-MM-DD HH:MM`, midnight ones date-only, NaN/NaT italic. Progress persists to localStorage `python-progress-v1` (read in a lazy useState initializer — safe because ssr:false; peach ✓ chips + "N of 19 solved" + reset button). Engine-load failure → in-artifact fallback, "Try again" reloads the page (Pyodide init assumed non-re-enterable after rejection, like sql.js). Pyodide 0.29.4 runs under `'wasm-unsafe-eval'` alone — no `'unsafe-eval'` needed (verified zero CSP violations under `next start`).
- **R sandbox artifact (10/).** `components/learn/r.tsx`: webR self-hosted from `public/webr/0.6.0/` + `public/webr/repo/` (populated by `scripts/fetch-webr.mjs` as `prebuild`; re-run with `--update` after version bumps) — ZERO third-party runtime bytes and ZERO page-CSP changes (same-origin worker takes CSP from its own response headers; the `/webr/:path*` headers() override keeps next dev/start equivalent to Netlify, where public assets get no CSP). PostMessage channel (no COOP/COEP on the site); R runs in a Web Worker so runs never block the page. Engine singleton mirrors python.tsx: click-gated "Load R — ~21 MB", dplyr+jsonlite installed from the local mirror, CSVs imported from `lib/learn/python-data.ts` (byte-identical data across 08/09/10), `R_SETUP_CODE` harness (`lib/learn/r-harness.ts`) builds master data.frames once and runs user + canonical solution in fresh `new.env()`s per Run (copy-on-modify isolation; data.table never loaded). Checker mirrors sql-check semantics (column count, canonical row sort unless `ordered`, atol 1e-9, NA ≡ NA); no reset_index dance — R has no index. Exercises in `lib/learn/r-exercises.ts` (19, mirroring SQL/Python one-for-one; prompts end "Assign your answer to result."). `npm run verify-r` runs every canonical solution through the checker in Node against the served assets (browser fallback: dev-only `window.__verifyAllR()`). Init watchdog (60s) converts webR's silent-hang failure mode into the in-artifact fallback; "Try again" reloads. Progress in localStorage `r-progress-v1`.
- **Schema-popover table chips (08/ SQL, 09/ Python).** `components/learn/table-chips.tsx` replaces the exercise card's static `tables.join(' · ')` mono label with one `<button>` chip per table, reading column names/type hints/row counts from generator-emitted `lib/learn/schema.ts` (`TABLE_SCHEMAS` — same `scripts/generate-sql-seed.mjs` run, zero extra PRNG calls, so `sql-seed.ts`/`python-data.ts` stay byte-identical). Hover opens (pointer:fine only, mirrors `useMagnetic`'s gating), click/tap and Enter/Space toggle, Escape/outside-click/blur close and Escape refocuses the chip; hover-visibility and click-toggle are tracked as separate state (OR'd into "open") because a real mouse click is always preceded by a hover — a single toggle would immediately re-close what hover just opened. A module-level claim/release pair enforces one popover open at a time across every chip group on the page (sort-controls.tsx dropdown ARIA/touch-target pattern is the precedent). The popover is `position: absolute` off a `position: relative` wrapper (scrolls naturally with the page) with a JS-computed `translateX` clamp so it never overflows the viewport at 320px — deliberately un-animated (no `animate-dropdown-in`), since a CSS animation driving `transform` would override that same inline clamp. Unknown table names render as the original static text.
- **Canvas dark mode via MutationObserver.** Learn artifact components read Catppuccin color tokens via `getComputedStyle()` and detect `.dark` class changes on `<html>` via `MutationObserver` to re-draw canvases. Each artifact has a `getThemeColors()` helper returning the current palette.
- **Learn artifact components are code-split.** `app/learn/[slug]/page.tsx` uses `next/dynamic` to lazy-load each artifact component, preventing all 10 from bundling into a single chunk.
- **Staggered page transitions.** `PageTransition` wraps each direct child with `fade-in-up` animation, 120ms stagger between sections. Tracks visited pages via module-level `Set` — first visit gets full stagger, return visits get a quick 200ms fade-in. View Transitions API enabled via `experimental.viewTransition: true` in `next.config.ts` for smooth crossfades between routes.
- **Per-element parallax.** Hero elements each have their own scroll speed (label fastest, badges slowest), creating a spread/dispersal effect on scroll. Uses refs + RAF + passive scroll listener — no state re-renders. Skipped entirely when `prefers-reduced-motion` is enabled. Parallax activates after 2.5s: at attach time, each parallax element gets `animation: 'none'; opacity: '1'; transform: ''` to clear the `forwards`-fill from entrance animations (which otherwise overrides inline transform), then a 0.6s `transform` transition for a smooth first-frame settle, removed after 700ms so subsequent scroll is instant.
- **Scroll-driven ref mutations (no re-renders).** Nav wordmark opacity and hero parallax both use direct `ref.style` mutations inside RAF callbacks instead of `setState`, avoiding React re-renders on every scroll frame.
- **Multi-accent hero badges.** Each hero badge pill has a distinct Catppuccin accent with tinted background, colored dot, and matching hover border. Current badges: "Top 20 Regional — SANS AWS CTF" (sapphire), "Zscaler Zero Trust Architect" (mauve), "MS in MIS — UIC '26" (peach), "AWS Cloud Security Builder" (lavender).
- **Character-by-character hero name reveal.** `RevealText` component splits text into per-character `<span>` elements with staggered `char-reveal` animation (clip-path mask via `overflow-hidden whitespace-nowrap` wrapper — nowrap prevents mid-word breaks between char spans at 320px). Uses `useSyncExternalStore` for `prefers-reduced-motion`. "Amir" starts at 0.3s, "Abdur-Rahim" at 0.5s, 40ms stagger per character. Name renders at `--step-6`.
- **Hero baseline axis.** Under the name, an SVG axis (480×20, `max-w-full`) draws itself on mount: mauve baseline + 4 downward ticks (staggered `draw-stroke` delays) + peach origin dot (`tick-commit`). Its wrapper div carries `ruleRef` for the hero parallax.
- **Cursor-reactive headshot.** `InteractiveHeadshot` tilts toward cursor (3deg max) with light-source shadow inside four FIXED `.reg-mark` registration corners (print metaphor: the plate tilts, the marks don't), with a mono plate caption below ("fig. 00 · Chicago — 41.88° N"). Perspective 3D + RAF + lerp, `getBoundingClientRect` cached via ResizeObserver. Disabled on touch.
- **RAF convergence checks.** The headshot RAF loop auto-stops when lerp values converge; the LivingField loop idle-pauses after 12s without interaction. No RAF loop on the site runs unbounded while idle.
- **Hero CTA + positioning blurb.** Below the tagline, a short positioning paragraph (healthcare data analyst / Epic EHR / MS MIS) fades in at 0.95s. Two CTA buttons follow: "Get in touch" (filled mauve, mailto) and "View resume" (outlined, links to `/Amir_Abdur-Rahim_Resume.pdf` in new tab), fading in at 1.1s/1.2s. Both are magnetic (`useMagnetic`) and use opacity-only `fade-in` entrances — a `fade-in-up` forwards fill would animate `transform` and permanently block the magnetic inline transform. Their container is in the parallax refs (rate 0.08). Badge entrance stagger starts at 1700+i*100ms; social icons at 1.35/1.45/1.55s.
- **Scroll progress bar.** `ScrollProgress` component shows a 2px mauve bar at the top of the viewport. Only renders on pages >2x viewport height (via ResizeObserver). Uses CSS `animation-timeline: scroll()` when supported (Chrome/Firefox), falls back to RAF-gated JS scroll listener for Safari.
- **Gallery count-up animation.** Photo count in gallery subtitle animates from 0 to target using RAF with cubic ease-out over 1.2s. Triggers on viewport entry via IntersectionObserver. Respects `prefers-reduced-motion`.
- **Numbered editorial sections.** Landing page sections use `01/`–`06/` numbered mono labels (peach accent number + slash separator) in ledger rail headers that alternate alignment (01 left, 02 right, …) at sm+. Each header has a factual mono annotation ("fig. NN · n = …") and a section-specific `SparkRule` (experience = rising step, projects/skills = bars, certifications = cumulative line, learn = descending loss curve). Sections alternate backgrounds: transparent → `bg-cream-dark/50 dark:bg-night-card/40` → transparent, etc. Each section keeps its ornamental diamond divider at top. Section 06 (Learn Teaser) uses the tinted background.
- **Multi-accent section pills.** Experience, Projects, Skills, and Education sections reuse the hero badge pill pattern — accent-tinted `bg-{color}/10`, `border-{color}/25`, colored dot, badge font. Each section/category gets a distinct accent from the Catppuccin palette.
- **Featured project marquee card.** `components/featured-project.tsx` renders a full-width rosewater-striped card above the Projects grid — links to `https://theli.app`, shows a 1206×2622 screenshot (`public/theli/home.png`), peach "Coming soon — App Store" status pill, and Swift/SwiftUI/Vision OCR/HealthKit tech pills. Launch-day swap is data-only (URL + pill text). Grid card delays shifted to 300+i*100ms to give the featured card clear visual separation.
- **Project provenance tags.** Each project card has a `provenance` field rendered as a mono 12px label under the subtitle (e.g. "Graduate coursework · UIC MS MIS", "SANS competition"). Communicates origin context at a glance without adding prose.
- **Certification grouping.** `lib/badges.ts` exports `badgeGroup(badge)` — keyword classifier (`/looker|lookml|bigquery|snow|data/i` → `"data"`, else `"cloud"`). `certifications.tsx` renders two `h3`-labeled groups: "Data & Analytics" (sapphire dot) and "Cloud & Security" (lavender dot). Empty groups are suppressed. Badge images are normalized to `bg-white/90 dark:bg-cream/95` chip so transparent-background PNGs render cleanly on both themes.
- **Learn index cards draw on reveal.** `LearnCard` toggles `is-drawn` on its illustration container when `useScrollReveal` fires; the illustrations in `app/learn/page.tsx` carry `draw-stroke` (+`pathLength={100}`) on solid strokes and `spark-bar` (+inline `transformBox: 'fill-box'` so each bar rises from its own baseline) on fill rects. Dashed strokes stay static — `draw-stroke` sets `stroke-dasharray: 100` and would destroy the dash pattern. The `.is-drawn .draw-stroke` descendant variant in globals.css (next to `.draw-stroke.is-drawn`) exists for exactly this parent-triggers-children case and is covered by the reduced-motion fully-drawn override.
- **Learn teaser section.** `components/learn-teaser.tsx` is homepage section 06 "Learning in Public". Pulls three artifacts by slug (`neural-networks`, `pca`, `shap`) from `lib/learn/artifacts.ts` via `TEASER_SLUGS`. Renders mini-cards (number, title, first 4 subtopics, section count) with an "Explore all {ARTIFACTS.length}" link to `/learn`. Uses `useScrollReveal` like all other sections.
- **Resume PDF.** `public/Amir_Abdur-Rahim_Resume.pdf` is served at `/Amir_Abdur-Rahim_Resume.pdf`. Source of truth is `~/job_search/resume.md`; export pipeline is `~/job_search/scripts/export-resume.mjs` (markdown → marked → headless Chrome PDF). To update: edit `resume.md`, run `node ~/job_search/scripts/export-resume.mjs`, copy the output to `public/`, commit.

## Design System — Catppuccin Editorial

**Aesthetic:** Magazine/editorial typography on Catppuccin color palette. Latte (warm grey) for light mode, Mocha (deep purple) for dark.

**Color tokens (light — Catppuccin Latte):** Base (`#eff1f5`), Mantle (`#e6e9ef`), Surface0 (`#ccd0da`), Text (`#4c4f69`), Subtext1 (`#5c5f77` — `ink-subtle`, 5.57:1 AA), Subtext0 (`#6c6f85`), Overlay1 (`#8c8fa1`)

**Color tokens (dark — Catppuccin Mocha):** Base (`#1e1e2e`), Mantle (`#181825`), Surface0 (`#313244`), Text (`#cdd6f4`), Subtext0 (`#a6adc8`)

**Multi-accent system (Latte / Mocha):**
- Mauve (`#8839ef` / `#cba6f7`) — structural: rules, underlines, selection, active Learn nav
- Peach (`#fe640b` / `#fab387`) — decorative: section numbers, ornaments, separators
- Sapphire (`#209fb5` / `#74c7ec`) — interactive: hover borders, footer link hovers, active Gallery nav
- Lavender (`#7287fd` / `#b4befe`) — ambient: headshot glow, moon icon, scroll indicator
- Rosewater (`#dc8a78` / `#f5e0dc`) — warm highlight: footer ornamental diamond, featured Theli card top-border + tech pill accent. `@property` registered (`--color-rosewater`) with 300ms `:root` transition. Note: `--color-gold-muted` in CSS is a legacy alias for this token.
- Teal (`#179299` / `#94e2d5`) — per-artifact accent for the Neural Networks learn explainer (section headers, active pills, hidden-layer toggle, output bars). Registered via `@property` for smooth theme-toggle interpolation.
- Yellow (`#df8e1d` / `#f9e2af`) — kept only for dark mode toggle sun icon

**CSS `@property` registered colors.** `--color-mauve`, `--color-peach`, `--color-sapphire`, `--color-lavender`, `--color-teal`, `--color-teal-dark`, `--color-rosewater` are registered via `@property` with `syntax: "<color>"` for smooth interpolation during theme toggles (300ms transition on `:root`).

**Fluid typography.** `--step--2` through `--step-6` custom properties in `@theme {}` use `clamp()` for smooth font scaling between 320px and 1280px+ viewports. Used by hero heading (`--step-6`), hero tagline (`--step-1`), nav wordmark (`--step-2` on sm+), section headings (`--step-3`, `--step-4` at sm+).

**Effects:** Animated grain texture overlay (`body::after` with SVG feTurbulence, `grain-drift` keyframe with `steps(4)` for film-frame effect, 12% light / 4% dark opacity). Sits behind all content via `isolation: isolate` on body + `z-index: -1` on pseudo-element; the LivingField canvas (also z-index −1, earlier in paint order) sits underneath the grain so texture reads on top of the data field. Sharp editorial shadows, mauve text selection. Nav wordmark underline is a dashed ledger rule (repeating-linear-gradient override at the end of globals.css).

**Animations:** `fade-in`, `fade-in-up`, `scale-in`, `dropdown-in`, `line-grow` (tick hairlines), `shimmer` (scroll indicator), `float` (scroll line bob), `char-reveal` (character text reveal), `circle-reveal` (dark mode toggle radial wipe), `grain-drift` (grain overlay position shift), `scroll-progress` (CSS scroll-driven progress bar), `gallery-morph-in` (lightbox open morph from thumbnail), `clip-reveal` (gallery photo card wipe from top), `draw-stroke` (SVG stroke-dashoffset draw for spark rules/axes), `bar-rise` (spark bar scaleY), `tick-commit` (header dot spring pop). Dark mode toggle: `icon-swap-in` (springy pop), `sun-spin`, `moon-rock`, `sun-glow` (gold), `moon-glow` (lavender). Staggered delays throughout hero and all landing page sections. The Living Ledger block at the end of globals.css includes a reduced-motion override that renders all drawn strokes/ticks fully drawn.

**Spring easing.** `--ease-spring` and `--ease-spring-settle` custom properties use CSS `linear()` function for natural multi-point spring curves. `--ease-spring` for hover entry (overshoot), `--ease-spring-settle` for settle-back. Used by `btn-lift`, `card-hover`, nav pill transitions, dark mode toggle, hero badge hovers, cert/project card transitions.

**Utility classes:** `btn-lift` (hover lift with spring overshoot), `card-hover` (hover lift + elevated shadow), `scrollbar-none` (hides scrollbar for horizontal scroll containers).

**CSS-based nav animations:** `.nav-wordmark::after` (mauve underline sweep), `.nav-gallery-pill::before` (sapphire fill sweep), `.nav-learn-pill::before` (mauve fill sweep), `.hero-line` (gradient vertical line). All use CSS `transform: scaleX()` transitions.

**Morphing nav indicator.** Absolutely positioned pill-shaped div that slides between Learn and Gallery pills with spring animation. Uses `offsetLeft`/`offsetWidth` for positioning (not `getBoundingClientRect`, which is affected by magnetic transforms). Color adapts via `color-mix()`: mauve for Learn, sapphire for Gallery. ResizeObserver on both pills handles re-measurement when sibling hovers change layout. Instant repositioning on resize, spring animation only on route changes.

**Magnetic nav pills.** Learn and Gallery pills subtly pull toward the cursor on hover (4px max displacement). Uses `mousemove`/`mouseleave` listeners with RAF + lerp (factor 0.15) and convergence check. Gated behind `(pointer: fine)`.

**Circular dark mode toggle.** View Transitions API with `:active-view-transition-type(theme-toggle)` scoping. `clip-path: circle()` expands from toggle button position (`--toggle-x`, `--toggle-y` CSS vars). Level 2 API with `types: ['theme-toggle']` tried first, falls back to Level 1, then flat crossfade for unsupported browsers. Respects `prefers-reduced-motion`.

**Learn artifact tab bar.** Horizontal pill links on each `/learn/[slug]` page for jumping between artifacts. Current one highlighted mauve. Scrollable on mobile with `scrollbar-none` utility; a self-masking right-edge gradient fade (`lg:hidden`, `from-cream dark:from-night`) hints scrollability — invisible wherever the row doesn't reach the edge.

## Mobile & Accessibility

- **320px (iPhone SE) safe.** Nav shows "A◆A" monogram on mobile (DM Serif Display with mauve diamond ornament), full name on sm+. Nav pills use `px-2.5 sm:px-4`, the right cluster `gap-3 sm:gap-5`, and the pill arrows are `max-sm:hidden` — all three are load-bearing: with the active-pill arrow visible at 320px the nav row overflows and the `min-w-0` monogram gets silently crushed into the Learn pill. Hero badges shrink `text-[12px] sm:text-[13px]` with `px-3 sm:px-4`. Cert grid goes single-column below 375px (`grid-cols-1 min-[375px]:grid-cols-2`).
- **`<meta name="theme-color">`** for mobile browser chrome. Light: Latte Base `#eff1f5`, Dark: Mocha Base `#1e1e2e`, using `media="(prefers-color-scheme)"`.
- **Touch targets ≥ 44px.** Footer links, Credly link, and sort dropdown options all have `py-3` padding. Social icon buttons and dark mode toggle are `w-11 h-11` (44px) with `gap-2` (8px) spacing.
- **WCAG AA contrast.** Body/label text uses `text-ink-subtle` (5.57:1 on Latte Base) instead of `text-ink-muted` (3.73:1). `text-ink-muted`/`text-ink-faint` reserved for decorative elements only (icon colors, the `+`/`=` connectors in pca.tsx). Minimum text size 12px (no `text-[10px]` or `text-[11px]` on readable content) — enforced across all learn artifacts.
- **Global focus ring.** `:focus-visible` shows 2px mauve outline with 3px offset (dark mode uses `mauve-dark`). Applied site-wide via `globals.css`.
- **`prefers-reduced-motion` supported.** Global CSS media query kills all animation durations/iterations. Hero parallax scroll listener is skipped entirely. `PageTransition` renders without `opacity: 0` start state. Gallery count-up shows final number immediately. Cursor effects gated behind `(pointer: fine)`. Gallery parallax respects this — only cursor effects are touch-gated, scroll parallax works on mobile.
- **Skip-to-content link and `<main>` landmark.** Layout includes a skip link (`sr-only` / `focus:not-sr-only`) targeting `<main id="main-content">`.
- **`aria-labelledby` on all sections.** Each section component references its `SectionHeader` heading via `aria-labelledby="section-{number}"`. Hero uses `aria-label="Introduction"`.
- **Gallery keyboard accessible.** Photo cards use native `<button>` elements with `aria-label` including camera/lens metadata. Sort dropdown uses `role="menu"`/`role="menuitem"` with `aria-controls`, `aria-label="Sort photos by"`, and `onBlur` close.
- **Learn artifact canvases keyboard-operable.** Pattern (reference: the XOR canvas in neural-networks.tsx): `tabIndex={0}` on the canvas, `onKeyDown` mirrors the pointer interaction, `aria-label` names the current state and the keys. Applied to: K-means centroid placement (focusable only in placing mode; arrows move a peach candidate crosshair drawn only while the canvas has focus, Enter places via the shared `placeCentroidAt`), DBSCAN inspect (arrows cycle `setClickedPt`, Enter toggles, Escape clears, plus an sr-only `role="status"` readout of neighbors/kind/cluster), SHAP beeswarm (ArrowUp/Down cycle the isolated feature, Escape clears). The log-loss unified-connection chain mirrors its hover highlight with `tabIndex={0}` + `onFocus`/`onBlur` on nodes and table rows.
- **Decorative elements hidden from screen readers.** All decorative SVGs (nav arrow, scroll progress, hero speckles, social icons, card arrows, sort chevron, dark mode toggle icons, nav monogram diamond) use `aria-hidden="true"` and `focusable="false"`. Nav monogram has `sr-only` span with full name.
- **External link labels.** All `target="_blank"` links include "(opens in new tab)" in `aria-label`.
- **`-webkit-tap-highlight-color: transparent`** on all `a` and `button` elements for clean mobile taps.
- **`100dvh` for hero.** Uses dynamic viewport height to account for mobile browser chrome. Hero top padding reduced on mobile (`pt-8 pb-20 sm:py-20`) so badges are visible above the fold.
- **Scroll indicator hidden on mobile.** The "Scroll" text + bobbing line is `hidden sm:flex` — only visible at 640px+ where it serves as a visual cue on full-viewport hero layouts.
- **Spine hidden below xl.** The homepage scroll axis is `hidden xl:block` — only at 1280px+ is the left margin wide enough that it can never cross content. Below xl, the header tick lines carry the ledger language.
- **`overflow-x: hidden` on body.** Prevents accidental horizontal scroll.

## File Structure

```
app/
  layout.tsx              # Root layout, fonts (4 families), metadata, theme-color, skip link, <main>, JSON-LD, nav, footer
  not-found.tsx           # Custom 404 page (editorial "wandered off the map", noindex)
  opengraph-image.tsx     # Branded OG image (Catppuccin Mocha, 1200x630)
  page.tsx                # Landing: Hero, Experience, Projects, Certifications, Skills, Education, LearnTeaser
  globals.css             # @property colors, @theme tokens, keyframes, utility classes, theme transitions, grain overlay
  sitemap.ts              # Generated /sitemap.xml (homepage + gallery + learn)
  robots.ts               # Generated /robots.txt (allow all, link to sitemap)
  gallery/
    opengraph-image.tsx   # Gallery OG image (Catppuccin Mocha, 1200x630)
    page.tsx              # Photography gallery page
  work/
    page.tsx              # Work index: case-study card grid
    opengraph-image.tsx   # Work OG image (Catppuccin Mocha, 1200x630)
    [slug]/
      page.tsx            # Case-study route: back link, article, conditional prev/next, JSON-LD ×2
      opengraph-image.tsx # Per-slug OG card: number + title + tech + chart-motif plate (Mocha hardcoded)
  learn/
    page.tsx              # Learn index: card grid of 10 interactive explainers
    opengraph-image.tsx   # Learn OG image (Catppuccin Mocha, 1200x630)
    [slug]/
      page.tsx            # Dynamic route: section rail, back link, tab bar (+scroll fade), artifact component, error boundary, prev/next nav, JSON-LD ×2
      opengraph-image.tsx # Per-slug OG card: number + title + subtopics + index-card illustration (Mocha hardcoded)
components/
  nav.tsx                 # Sticky nav: AA monogram (mobile) / full name (desktop), Learn pill (mauve), Gallery pill (sapphire), morphing indicator, magnetic hover, thin rule
  footer.tsx              # Editorial footer: name, tagline, links, diamond ornaments
  dark-mode-toggle.tsx    # Circular clip-path reveal via View Transitions API (fallback: crossfade)
  hero.tsx                # Asymmetric hero: character-reveal name (--step-6), drawn baseline axis, headshot, blurb, magnetic CTA pair, badges, parallax
  living-field.tsx        # Site-wide fixed-canvas data field (both themes, route-based intensity, reduced-motion static frame)
  spine.tsx               # Homepage scroll axis: drawn peach→mauve stroke + pen tip in the left margin (xl+)
  spark-rule.tsx          # Self-drawing SVG data strokes: line/step/bars variants (server component)
  count-up.tsx            # Shared count-up numeral (aria-hidden digits + sr-only value)
  featured-project.tsx   # Full-width rosewater-striped Theli card above Projects grid (client component)
  interactive-headshot.tsx# Cursor-reactive 3D tilt headshot inside fixed registration marks, plate caption
  section-divider.tsx     # Shared ornamental diamond divider (server component)
  section-header.tsx      # Ledger rail section header: tick line + dot commit, align/annotation/spark props (server component)
  certifications.tsx      # 03/ Credly badge grid, grouped Data & Analytics / Cloud & Security
  experience.tsx          # 01/ Professional Experience — featured ScribeAmerica card
  projects.tsx            # 02/ Things I've Built — featured Theli card + 6-card grid (Parkinson's, WIEIAD, DocDefend+, StudentPM, LightERP, CTF) with provenance tags
  skills.tsx              # 04/ Technical Stack — 5 categorized pill rows
  education.tsx           # 05/ Education — MS MIS + BA Psychology with coursework
  animated-text.tsx       # Staggered word-by-word text reveal
  scroll-progress.tsx     # Mauve scroll progress bar (CSS scroll-driven with JS fallback)
  page-transition.tsx     # Staggered fade-in-up page wrapper (reduced-motion safe)
  learn-teaser.tsx        # 06/ Learning in Public — 3 mini-cards (neural-networks, pca, shap) + Explore all link (client component)
  gallery/
    masonry-grid.tsx      # Masonry layout with sort + lightbox + progressive loading (12 at a time)
    photo-card.tsx        # BlurHash placeholder + clip-path reveal + scroll parallax
    sort-controls.tsx     # Styled sort dropdown (menu/menuitem ARIA)
  work/
    work-card.tsx         # /work index card: accent stripe + provenance + tech pills, internal Link (client)
    case-study-article.tsx# Data-driven case-study body: title block, metric tiles, paired bars, sections, links (client)
    tableau-embed.tsx     # Click-gated Tableau Public iframe + on-design placeholder (client)
    work-nav.tsx          # Prev/next between case studies (server; caller hides it when both are null)
  learn/
    learn-card.tsx        # Index page card (illustration + number + title + accent pills, is-drawn reveal)
    learn-nav.tsx         # Prev/next navigation between artifacts (server component)
    section-rail.tsx      # Sticky ledger section nav in the left margin at xl+ (IO highlight, client component)
    artifact-error-boundary.tsx # Error boundary with editorial fallback + "Try again" button
    dynamic-artifacts.tsx # Client wrapper for ssr: false dynamic imports (Log Loss, PCA, Clustering, SHAP, Neural Networks, SQL, Python, R)
    gradient-descent.tsx  # 01/ Gradient Descent (4 sections: tangent line + drag, sparkline + compare, noise slider + smoothness, side-by-side GD vs GB)
    log-loss-cross-entropy.tsx # 02/ Log Loss & Cross-Entropy (4 sections: QQ + Shapiro-Wilk, sweep + multi-sample, info gain calc, hover-linked chain)
    pca.tsx               # 03/ PCA (5 sections: reconstruction + sweep, Kaiser criterion, before/after scatter, projection canvas, preset weights)
    regularization.tsx    # 04/ Regularization (2 sections: side-by-side Ridge/Lasso + sweep, bias-variance decomposition + canvas drag, linked lambda)
    clustering.tsx        # 05/ Clustering (3 sections: centroid trail + click-to-place, linkage toggle, interactive eps + cluster sparkline)
    shap.tsx              # 06/ SHAP (4 sections: feature value waterfall, click-highlight + correlation arrows, cumulative importance, subset lattice)
    neural-networks.tsx   # 07/ Neural Networks (7 sections: neuron anatomy, XOR & linear separability (XNOR combinator toggle), activations & vanishing gradients, backprop walkthrough (5-stage step-through), momentum vs vanilla GD, training a tiny MLP, autoencoder vs PCA (2→1→4→2 AE))
    sql.tsx               # 08/ SQL (5 sections: SELECT/WHERE/ORDER BY, GROUP BY/HAVING, joins & fan-out, window functions, challenges — 19 checked exercises on sql.js)
    python.tsx            # 09/ Python (5 sections: filtering, groupby, merging, windows, challenges — 19 checked pandas exercises on Pyodide, click-to-load from CDN)
    r.tsx                 # 10/ R (5 sections: filtering, group & summarise, joins, windows, challenges — 19 checked dplyr exercises on webR, click-to-load, self-hosted)
    table-chips.tsx       # Shared schema-popover chips for the SQL/Python exercise cards' table labels (hover/click/keyboard, reads lib/learn/schema.ts)
lib/
  hooks.ts                # Shared hooks: useHydrated(), useScrollReveal()
  styles.ts               # Shared accent style map (ACCENT_STYLES)
  types.ts                # Photo type definition (url, thumb?, blurhash?, date, camera, lens)
  badges.ts               # Credly API fetcher + manual badges, exports getAllBadges()
  learn/
    artifacts.ts          # Artifact metadata array: slug, title, description, subtopics, order, sections (rail ids + labels)
    sql-seed.ts           # GENERATED deterministic healthcare seed (patients/encounters/labs/medications) — regenerate via scripts/generate-sql-seed.mjs
    sql-exercises.ts      # 19 exercise definitions (prompt, hint, solution, ordered, tables)
    sql-check.ts          # Result-set comparator (positional, tolerant, ordered/unordered)
    python-data.ts        # GENERATED CSV rendering of the same dataset — parsed by 09/ Python (pandas) AND 10/ R (read.csv); same generator run, same seed
    python-exercises.ts   # 19 pandas exercise definitions mirroring the SQL arc (prompt, hint, solution, resultType, ordered, tables)
    schema.ts             # GENERATED table/column/type/row-count metadata for the schema-popover chips — same generator run, zero extra PRNG calls
    r-harness.ts          # R_SETUP_CODE — master frames + fresh-env runner + positional checker (R side of 10/)
    r-exercises.ts        # 19 dplyr exercise definitions mirroring the SQL/Python arc
  work/
    case-studies.ts       # Single source of truth for /work (currently: the Tableau airline story)
    unpublished-drafts.ts # Six quarantined draft studies — imported by nothing, prose unverified
scripts/
  add-photo.mjs           # One-command photo addition (supports multiple files): upload + thumbnail + blurhash + photos.json
  add-photo-gui.mjs       # Native macOS Finder picker → feeds selections to add-photo.mjs
  generate-thumbnails.mjs # Batch thumbnail generation for all photos (sharp, 1600px, mozjpeg q80)
  generate-blurhash.mjs   # Batch BlurHash generation for all photos (4x3 components from thumbnails)
  generate-sql-seed.mjs   # Seed generator + teaching-shape assertions (writes lib/learn/sql-seed.ts, lib/learn/python-data.ts, AND lib/learn/schema.ts from one PRNG stream)
  fetch-webr.mjs          # populates public/webr/ (runtime + package mirror) at build time; webr-assets.lock.json is its committed sha256 lock
  verify-r-exercises.mjs  # webR-in-Node gate: all 19 canonical solutions must pass the checker
public/
  photos.json             # Photo metadata (CloudFront URLs + thumb URLs, EXIF data)
  badges/                 # Non-Credly badge images (e.g. Zscaler, Snowflake)
  theli/
    home.png              # Theli app screenshot (1206×2622, used by featured-project.tsx)
  sql-wasm.wasm           # sql.js WASM binary (re-copy on sql.js bumps), served at /sql-wasm.wasm
  webr/                   # GITIGNORED — webR runtime + dplyr/jsonlite mirror, regenerated by scripts/fetch-webr.mjs
  Amir_Abdur-Rahim_Resume.pdf  # Resume PDF served at /Amir_Abdur-Rahim_Resume.pdf; source: ~/job_search/resume.md
next.config.ts            # Image remote patterns (CloudFront, Credly), experimental.viewTransition
netlify.toml              # Netlify build config + CSP, HSTS, cache headers
.nvmrc                    # Node version (20) for Netlify
```

## Photos

- Hosted on S3 via CloudFront: `https://d36t8s1mzbufg5.cloudfront.net/`
- Thumbnails (1600px, mozjpeg q80) at `https://d36t8s1mzbufg5.cloudfront.net/thumbs/`
- S3 bucket: `amirabdurrahim-photos`
- Metadata in `public/photos.json` (url, thumb, date, camera, lens)
- ~56 photos currently, multi-camera (Sony ILCE-6300/6700, Fujifilm X100VI) — brands derived dynamically from EXIF `camera` field in `masonry-grid.tsx` (prefixes: ILCE→Sony, X100/X-T/X-S→Fujifilm, NIKON→Nikon)
- Right-click disabled on gallery images
- Gallery grid serves responsive renditions of the 1600px thumbnails via the image optimizer (~30–100KB each depending on cell size/DPR); lightbox loads full-resolution originals (~10MB)
- To add photos: `node scripts/add-photo.mjs "/path/to/photo.jpg"` — auto-detects date from filename, guesses camera/lens from prefix, uploads original + thumb to S3, updates `photos.json`. Then commit and push.

## Security Headers

Split across two files because Netlify only applies `netlify.toml` `[[headers]]` to static-asset responses — page routes are served by the `@netlify/plugin-nextjs` function, which ignores them (verified live 2026-07-07; the toml-only CSP never reached pages).

`next.config.ts` `headers()` (applies to all Next-served routes, i.e. every page):
- **CSP:** `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` + same-origin defaults, CloudFront/Credly img allowlist, `frame-ancestors 'none'`. `'unsafe-inline'` (not a hash) is load-bearing: the App Router injects per-page inline RSC flight scripts that can't be hash-pinned, and the presence of ANY hash makes browsers ignore `'unsafe-inline'` — never add a hash to script-src without switching to nonce middleware. `'wasm-unsafe-eval'` is required by sql.js on /learn/sql.
- **X-Frame-Options / Referrer-Policy / Permissions-Policy / HSTS** (`max-age=63072000; includeSubDomains; preload`) ride along in the same block.
- **Route-scoped CSP overrides:** entries after the `/(.*)'` block re-issue the CSP per route — for duplicate header keys the last matching source wins. `/learn/python` adds `https://cdn.jsdelivr.net` to `script-src` + `connect-src` (Pyodide); `/work/airline-flight-patterns` adds `frame-src https://public.tableau.com` (the click-gated Tableau iframe — frame-src ONLY, no script-src change). `/webr/:path*` re-issues the CSP with `'unsafe-eval'` for the webR worker's OWN asset responses only (never a document) — on Netlify those files are CDN-served with no CSP at all, so this override exists to keep `next dev`/`next start` equivalent; the site-wide and /learn/r page policies are unchanged. The site-wide CSP stays third-party-free; never widen the generic rule for a single route's needs. Gotcha: `next dev` does NOT hot-reload next.config.ts — a dev server predating a CSP change keeps serving stale headers, which blocks new embeds/engines with Chrome's "This content is blocked" while looking like a site bug. Restart the dev server after any headers() change.

`netlify.toml` (static assets only):
- **nosniff + HSTS** on `/*` as asset-level defense in depth
- **Cache:** Immutable 1-year cache on `/_next/static/*` and `/badges/*`, 1-day cache on `/sql-wasm.wasm`

## SEO

- `app/sitemap.ts` generates `/sitemap.xml` (homepage priority 1 monthly, gallery priority 0.8 weekly, learn index priority 0.8 monthly, 10 artifact pages priority 0.7 monthly)
- `app/robots.ts` generates `/robots.txt` (allow all, link to sitemap)
- JSON-LD `Person` schema in `layout.tsx` `<head>` (hardcoded object literal via `JSON.stringify`, no user input — safe)
- JSON-LD `LearningResource` + `BreadcrumbList` (Home → Learn → artifact) schemas on each `/learn/[slug]` page (rendered as `<script>` tags in JSX, not via metadata.other; all values hardcoded from artifacts.ts — safe)
- Canonical URLs on homepage, gallery, and learn pages via `alternates.canonical`
- `og:type` set to `'profile'` on homepage
- Twitter card metadata on gallery and learn pages
- 404 page has `robots: { index: false }`

## Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Serve production build locally
npm run lint      # ESLint (flat config via eslint.config.mjs, not next lint)
npm run fetch-webr  # populate public/webr/ (runs automatically as prebuild)
npm run verify-r    # run all 19 R solutions through the checker (webR in Node)
```

**Known lint errors (pre-existing, not regressions):** 2 errors — `interactive-headshot.tsx` (react-hooks/immutability — `animate` accessed before declaration) and `masonry-grid.tsx` (react-hooks/set-state-in-effect — setState in the shuffle/sort effect body). Both safe to ignore.

## Certifications

- Badges fetched dynamically from Credly API at build time via `lib/badges.ts`
- `getAllBadges()` merges Credly badges + manual badges (e.g. Zscaler), sorts newest first
- Credly API: `https://www.credly.com/users/amir-abdur-rahim/badges.json` (revalidates daily, 5s AbortController timeout, runtime validation + filtering for malformed entries)
- Manual badges defined in `lib/badges.ts` `manualBadges` array — for non-Credly certs
- Manual badges: Zscaler Zero Trust Architect (`public/badges/zscaler-ztca.jpeg`), SnowPro Associate (`public/badges/snowflake-snowpro-core.png`), SANS AWS CTF Top 20 (`public/badges/sans-aws-ctf.png`)
- New Credly badges appear automatically on next build/revalidation
- To add a non-Credly badge: add entry to `manualBadges` in `lib/badges.ts`, put image in `public/badges/`
- Credly profile: `https://www.credly.com/users/amir-abdur-rahim`
