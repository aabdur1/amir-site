# amir-site

Personal website for Amir Abdur-Rahim at amirabdurrahim.com. Landing page (hero + 5 editorial resume sections) + photography gallery + interactive data mining explainers.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 (CSS-first `@theme` configuration in `app/globals.css`)
- **Lightbox:** yet-another-react-lightbox (gallery EXIF overlay + zoom)
- **Deployment:** Netlify (connected to GitHub repo, `@netlify/plugin-nextjs`)
- **Domain:** amirabdurrahim.com

## Key Conventions

- **No component libraries.** All components are hand-crafted. No shadcn/ui, no Radix, no MUI.
- **CSS-first Tailwind config.** Design tokens live in `app/globals.css` via `@theme {}`, not in a JS config file.
- **Fonts via next/font/google.** DM Serif Display (headings), DM Sans (body), Share Tech Mono (mono/tags), Lora (credential badges). Loaded as CSS variables (`--font-display`, `--font-body`, `--font-mono`, `--font-badge`) in `app/layout.tsx`.
- **Dark mode via class toggle.** Uses `.dark` class on `<html>`. Custom variant defined in globals.css: `@custom-variant dark (&:where(.dark, .dark *));`. Blocking inline `<script>` in `layout.tsx` prevents flash of wrong theme on load. Toggle uses View Transitions API (`startViewTransition`) with circular clip-path reveal when supported, falling back to `.theme-transitioning` class for 300ms crossfade.
- **No icon libraries.** Icons are inline SVGs.
- **Client components marked explicitly.** Components using `"use client"`: nav, dark-mode-toggle, hero, animated-text, hero-speckles, interactive-headshot, certifications, experience, projects, skills, education, footer, scroll-progress, page-transition. Gallery components (masonry-grid, photo-card, sort-controls) are also client components. Learn components (learn-card, gradient-descent, log-loss-cross-entropy, pca, regularization, clustering, shap) are client components. learn-nav is a server component.
- **No shorthand/longhand mixing in inline styles.** Always fold `animationDelay` into the `animation` shorthand to avoid React warnings.

## Key Patterns

- **Shared hooks in `lib/hooks.ts`.** `useHydrated()` (hydration-safe boolean via `useSyncExternalStore`) and `useScrollReveal()` (IntersectionObserver with threshold 0.1, disconnect-after-first-intersection, returns `[ref, visible]`). Used by hero, footer, animated-text (hydrated) and all 5 section components (scroll reveal).
- **Shared components.** `SectionDivider` (server component, diamond ornament with `color` and `absolute` props) and `SectionHeader` (server component, numbered label + heading + mauve rule, receives `visible` prop). Used by all 5 section components + footer.
- **Shared accent styles in `lib/styles.ts`.** Unified `ACCENT_STYLES` map (sapphire, mauve, peach, lavender) with `bg`, `border`, `hoverBorder`, `dot`, `text` classes. Used by hero badges, skills pills, and project cards. Projects extends with local `STRIPE_STYLES` for top border color.
- **`next/image` for optimized images.** Headshot uses `fill` + `priority` (LCP element), badges use explicit `width/height`. Gallery grid uses `photo.thumb` (1600px web-optimized thumbnails via CloudFront `/thumbs/`) with `unoptimized`, lightbox uses full-resolution `photo.url`. Remote patterns configured in `next.config.ts` for CloudFront and Credly domains.
- **Gallery thumbnail pipeline.** `scripts/add-photo.mjs` handles the full workflow: uploads original to S3, generates 1600px mozjpeg thumbnail via `sharp`, uploads thumbnail to S3 `/thumbs/`, updates `photos.json`. `scripts/generate-thumbnails.mjs` batch-generates thumbnails for all photos. Thumbnails are ~250KB vs ~10MB originals (97-99% reduction).
- **Gallery progressive loading.** Only 12 photos render initially. IntersectionObserver on a sentinel div triggers loading of the next 12 as the user scrolls (infinite scroll pattern). Prevents mounting 50+ Image components at once.
- **Gallery parallax.** Each photo card has a `will-change-transform` wrapper inside `overflow-hidden`. RAF-gated scroll listener applies `scale(1.08) translateY(offset)` based on card distance from viewport center. Works on both desktop and mobile. Respects `prefers-reduced-motion`.
- **Blur-up image loading.** Gallery photo cards show a blurred placeholder and transition to the full image on load, using CSS filter transitions. Custom implementation (not `placeholder="blur"`) to avoid needing `blurDataURL` per remote image.
- **Branded OG images.** `app/opengraph-image.tsx`, `app/gallery/opengraph-image.tsx`, and `app/learn/opengraph-image.tsx` generate 1200x630 PNGs at build time using `ImageResponse` from `next/og`. Catppuccin Mocha branding with DM Serif Display font loaded from Google Fonts gstatic (with try/catch fallback if font fetch fails). No hardcoded `images` in metadata — Next.js auto-injects from these routes. `app/learn/[slug]/opengraph-image.tsx` re-exports the learn OG image for artifact pages.
- **Metadata-driven learn section.** `lib/learn/artifacts.ts` is the single source of truth for all artifact metadata (slug, title, description, subtopics, section count). The index page, prev/next nav, sitemap entries, and JSON-LD `LearningResource` schema all derive from this array. Adding a new artifact: create the component, add an entry to the array.
- **Learn artifact error boundary.** `ArtifactErrorBoundary` class component wraps each artifact in `app/learn/[slug]/page.tsx`. Shows editorial-styled fallback with "Try again" button if a canvas/interaction throws.
- **Learn artifacts with ssr: false.** 4 of 6 learn artifacts (Log Loss, PCA, Clustering, SHAP) use `Math.random()` in `useState` initializers. They're loaded via `components/learn/dynamic-artifacts.tsx` — a `'use client'` wrapper that re-exports them with `next/dynamic` `{ ssr: false }` to avoid hydration mismatches. Gradient Descent and Regularization use deterministic initial data and load with SSR.
- **Canvas dark mode via MutationObserver.** Learn artifact components read Catppuccin color tokens via `getComputedStyle()` and detect `.dark` class changes on `<html>` via `MutationObserver` to re-draw canvases. Each artifact has a `getThemeColors()` helper returning the current palette.
- **Learn artifact components are code-split.** `app/learn/[slug]/page.tsx` uses `next/dynamic` to lazy-load each artifact component, preventing all 6 from bundling into a single chunk.
- **Staggered page transitions.** `PageTransition` wraps each direct child with `fade-in-up` animation, 120ms stagger between sections. Tracks visited pages via module-level `Set` — first visit gets full stagger, return visits get a quick 200ms fade-in. View Transitions API enabled via `experimental.viewTransition: true` in `next.config.ts` for smooth crossfades between routes.
- **Per-element parallax.** Hero elements each have their own scroll speed (label fastest, badges slowest), creating a spread/dispersal effect on scroll. Uses refs + RAF + passive scroll listener — no state re-renders. Skipped entirely when `prefers-reduced-motion` is enabled. Parallax activates after 2.5s with a smooth 0.6s transition to prevent jarring jump after entry animations.
- **Scroll-driven ref mutations (no re-renders).** Nav wordmark opacity and hero parallax both use direct `ref.style` mutations inside RAF callbacks instead of `setState`, avoiding React re-renders on every scroll frame.
- **Multi-accent hero badges.** Each hero badge pill has a distinct Catppuccin accent (sapphire, mauve, peach, lavender) with tinted background, colored dot, and matching hover border.
- **Character-by-character hero name reveal.** `RevealText` component splits text into per-character `<span>` elements with staggered `char-reveal` animation (clip-path mask via `overflow-hidden` wrapper). Uses `useSyncExternalStore` for `prefers-reduced-motion`. "Amir" starts at 0.3s, "Abdur-Rahim" at 0.5s, 40ms stagger per character.
- **Cursor-reactive hero speckles (dark mode only).** `HeroSpeckles` renders viewport-proportional Catppuccin dots that drift from cursor. Seeded PRNG, RAF + lerp with convergence check. Disabled on touch/reduced-motion.
- **Cursor-reactive headshot.** `InteractiveHeadshot` tilts toward cursor (3deg max) with light-source shadow. Perspective 3D + RAF + lerp, `getBoundingClientRect` cached via ResizeObserver. Disabled on touch.
- **RAF convergence checks.** Speckle and headshot RAF loops auto-stop when lerp values converge, preventing idle 60fps loops.
- **Parallax delayed start.** Hero parallax attaches after 2.5s to avoid conflicting with entrance `fade-in-up` animation fill. Smooth 0.6s transition on first frame prevents visual jump.
- **Scroll progress bar.** `ScrollProgress` component shows a 2px mauve bar at the top of the viewport. Only renders on pages >2x viewport height (via ResizeObserver). Uses CSS `animation-timeline: scroll()` when supported (Chrome/Firefox), falls back to RAF-gated JS scroll listener for Safari.
- **Gallery count-up animation.** Photo count in gallery subtitle animates from 0 to target using RAF with cubic ease-out over 1.2s. Triggers on viewport entry via IntersectionObserver. Respects `prefers-reduced-motion`.
- **Numbered editorial sections.** Landing page sections use `01/`–`05/` numbered mono labels (peach accent number + slash separator). Sections alternate backgrounds: transparent → `bg-cream-dark/50 dark:bg-night-card/40` → transparent, etc. Each section has an ornamental diamond divider at top, display font heading, and mauve accent rule with `line-grow` animation.
- **Multi-accent section pills.** Experience, Projects, Skills, and Education sections reuse the hero badge pill pattern — accent-tinted `bg-{color}/10`, `border-{color}/25`, colored dot, badge font. Each section/category gets a distinct accent from the Catppuccin palette.

## Design System — Catppuccin Editorial

**Aesthetic:** Magazine/editorial typography on Catppuccin color palette. Latte (warm grey) for light mode, Mocha (deep purple) for dark.

**Color tokens (light — Catppuccin Latte):** Base (`#eff1f5`), Mantle (`#e6e9ef`), Surface0 (`#ccd0da`), Text (`#4c4f69`), Subtext1 (`#5c5f77` — `ink-subtle`, 5.57:1 AA), Subtext0 (`#6c6f85`), Overlay1 (`#8c8fa1`)

**Color tokens (dark — Catppuccin Mocha):** Base (`#1e1e2e`), Mantle (`#181825`), Surface0 (`#313244`), Text (`#cdd6f4`), Subtext0 (`#a6adc8`)

**Multi-accent system (Latte / Mocha):**
- Mauve (`#8839ef` / `#cba6f7`) — structural: rules, underlines, selection, active Learn nav
- Peach (`#fe640b` / `#fab387`) — decorative: section numbers, ornaments, separators
- Sapphire (`#209fb5` / `#74c7ec`) — interactive: hover borders, footer link hovers, active Gallery nav
- Lavender (`#7287fd` / `#b4befe`) — ambient: headshot glow, moon icon, scroll indicator
- Rosewater (`#dc8a78` / `#f5e0dc`) — warm highlight: footer ornamental diamond. Note: `--color-gold-muted` in CSS is a legacy alias for this token.
- Yellow (`#df8e1d` / `#f9e2af`) — kept only for dark mode toggle sun icon

**CSS `@property` registered colors.** `--color-mauve`, `--color-peach`, `--color-sapphire`, `--color-lavender` are registered via `@property` with `syntax: "<color>"` for smooth interpolation during theme toggles (300ms transition on `:root`).

**Fluid typography.** `--step--2` through `--step-5` custom properties in `@theme {}` use `clamp()` for smooth font scaling between 320px and 1280px viewports. Used by hero heading (`--step-5`), hero tagline (`--step-1`), nav wordmark (`--step-2` on sm+), section headings (`--step-3`).

**Effects:** Animated grain texture overlay (`body::after` with SVG feTurbulence, `grain-drift` keyframe with `steps(4)` for film-frame effect, 12% light / 4% dark opacity). Sits behind all content via `isolation: isolate` on body + `z-index: -1` on pseudo-element. Sharp editorial shadows, mauve text selection, cursor-reactive color speckles (dark mode only).

**Animations:** `fade-in`, `fade-in-up`, `scale-in`, `dropdown-in`, `line-grow` (mauve accent rule), `shimmer` (scroll indicator), `float` (scroll line bob), `char-reveal` (character text reveal), `circle-reveal` (dark mode toggle radial wipe), `grain-drift` (grain overlay position shift), `scroll-progress` (CSS scroll-driven progress bar). Dark mode toggle: `icon-swap-in` (springy pop), `sun-spin`, `moon-rock`, `sun-glow` (gold), `moon-glow` (lavender). Staggered delays throughout hero and all landing page sections (experience, projects, certifications, skills, education).

**Spring easing.** `--ease-spring` and `--ease-spring-settle` custom properties use CSS `linear()` function for natural multi-point spring curves. `--ease-spring` for hover entry (overshoot), `--ease-spring-settle` for settle-back. Used by `btn-lift`, `card-hover`, nav pill transitions, dark mode toggle, hero badge hovers, cert/project card transitions.

**Utility classes:** `btn-lift` (hover lift with spring overshoot), `card-hover` (hover lift + elevated shadow), `scrollbar-none` (hides scrollbar for horizontal scroll containers).

**CSS-based nav animations:** `.nav-wordmark::after` (mauve underline sweep), `.nav-gallery-pill::before` (sapphire fill sweep), `.nav-learn-pill::before` (mauve fill sweep), `.hero-line` (gradient vertical line). All use CSS `transform: scaleX()` transitions.

**Morphing nav indicator.** Absolutely positioned pill-shaped div that slides between Learn and Gallery pills with spring animation. Uses `offsetLeft`/`offsetWidth` for positioning (not `getBoundingClientRect`, which is affected by magnetic transforms). Color adapts via `color-mix()`: mauve for Learn, sapphire for Gallery. ResizeObserver on both pills handles re-measurement when sibling hovers change layout. Instant repositioning on resize, spring animation only on route changes.

**Magnetic nav pills.** Learn and Gallery pills subtly pull toward the cursor on hover (4px max displacement). Uses `mousemove`/`mouseleave` listeners with RAF + lerp (factor 0.15) and convergence check. Gated behind `(pointer: fine)`.

**Circular dark mode toggle.** View Transitions API with `:active-view-transition-type(theme-toggle)` scoping. `clip-path: circle()` expands from toggle button position (`--toggle-x`, `--toggle-y` CSS vars). Level 2 API with `types: ['theme-toggle']` tried first, falls back to Level 1, then flat crossfade for unsupported browsers. Respects `prefers-reduced-motion`.

**Learn artifact tab bar.** Horizontal pill links on each `/learn/[slug]` page for jumping between artifacts. Current one highlighted mauve. Scrollable on mobile with `scrollbar-none` utility.

## Mobile & Accessibility

- **320px (iPhone SE) safe.** Nav shows "A◆A" monogram on mobile (DM Serif Display with mauve diamond ornament), full name on sm+. Hero badges shrink `text-[12px] sm:text-[13px]` with `px-3 sm:px-4`. Cert grid goes single-column below 375px (`grid-cols-1 min-[375px]:grid-cols-2`).
- **`<meta name="theme-color">`** for mobile browser chrome. Light: Latte Base `#eff1f5`, Dark: Mocha Base `#1e1e2e`, using `media="(prefers-color-scheme)"`.
- **Touch targets ≥ 44px.** Footer links, Credly link, and sort dropdown options all have `py-3` padding. Social icon buttons and dark mode toggle are `w-11 h-11` (44px) with `gap-2` (8px) spacing.
- **WCAG AA contrast.** Body/label text uses `text-ink-subtle` (5.57:1 on Latte Base) instead of `text-ink-muted` (3.73:1). `text-ink-muted` reserved for decorative icon colors only. Minimum text size 12px (no `text-[10px]` or `text-[11px]` on readable content).
- **Global focus ring.** `:focus-visible` shows 2px mauve outline with 3px offset (dark mode uses `mauve-dark`). Applied site-wide via `globals.css`.
- **`prefers-reduced-motion` supported.** Global CSS media query kills all animation durations/iterations. Hero parallax scroll listener is skipped entirely. `PageTransition` renders without `opacity: 0` start state. Gallery count-up shows final number immediately. Cursor effects gated behind `(pointer: fine)`. Gallery parallax respects this — only cursor effects are touch-gated, scroll parallax works on mobile.
- **Skip-to-content link and `<main>` landmark.** Layout includes a skip link (`sr-only` / `focus:not-sr-only`) targeting `<main id="main-content">`.
- **`aria-labelledby` on all sections.** Each section component references its `SectionHeader` heading via `aria-labelledby="section-{number}"`. Hero uses `aria-label="Introduction"`.
- **Gallery keyboard accessible.** Photo cards use native `<button>` elements with `aria-label` including camera/lens metadata. Sort dropdown uses `role="menu"`/`role="menuitem"` with `aria-controls`, `aria-label="Sort photos by"`, and `onBlur` close.
- **Decorative elements hidden from screen readers.** All decorative SVGs (nav arrow, scroll progress, hero speckles, social icons, card arrows, sort chevron, dark mode toggle icons, nav monogram diamond) use `aria-hidden="true"` and `focusable="false"`. Nav monogram has `sr-only` span with full name.
- **External link labels.** All `target="_blank"` links include "(opens in new tab)" in `aria-label`.
- **`-webkit-tap-highlight-color: transparent`** on all `a` and `button` elements for clean mobile taps.
- **`100dvh` for hero.** Uses dynamic viewport height to account for mobile browser chrome. Hero top padding reduced on mobile (`pt-8 pb-20 sm:py-20`) so badges are visible above the fold.
- **Scroll indicator hidden on mobile.** The "Scroll" text + bobbing line is `hidden sm:flex` — only visible at 640px+ where it serves as a visual cue on full-viewport hero layouts.
- **Hero decorative line hidden on mobile.** The vertical accent line (`hero-line`) is `hidden sm:block` — only visible at 640px+ where left margin clears content.
- **`overflow-x: hidden` on body.** Prevents accidental horizontal scroll.

## File Structure

```
app/
  layout.tsx              # Root layout, fonts (4 families), metadata, theme-color, skip link, <main>, JSON-LD, nav, footer
  not-found.tsx           # Custom 404 page (editorial "wandered off the map", noindex)
  opengraph-image.tsx     # Branded OG image (Catppuccin Mocha, 1200x630)
  page.tsx                # Landing: Hero, Experience, Projects, Certifications, Skills, Education
  globals.css             # @property colors, @theme tokens, keyframes, utility classes, theme transitions, grain overlay
  sitemap.ts              # Generated /sitemap.xml (homepage + gallery + learn)
  robots.ts               # Generated /robots.txt (allow all, link to sitemap)
  gallery/
    opengraph-image.tsx   # Gallery OG image (Catppuccin Mocha, 1200x630)
    page.tsx              # Photography gallery page
  learn/
    page.tsx              # Learn index: card grid of 6 interactive explainers
    opengraph-image.tsx   # Learn OG image (Catppuccin Mocha, 1200x630)
    [slug]/
      page.tsx            # Dynamic route: back link, artifact component, error boundary, prev/next nav, JSON-LD
      opengraph-image.tsx # Re-exports learn OG image
components/
  nav.tsx                 # Sticky nav: AA monogram (mobile) / full name (desktop), Learn pill (mauve), Gallery pill (sapphire), morphing indicator, magnetic hover, thin rule
  footer.tsx              # Editorial footer: name, tagline, links, diamond ornaments
  dark-mode-toggle.tsx    # Circular clip-path reveal via View Transitions API (fallback: crossfade)
  hero.tsx                # Asymmetric hero: character-reveal name, headshot, badges, parallax
  interactive-headshot.tsx# Cursor-reactive 3D tilt headshot (light-source shadow)
  section-divider.tsx     # Shared ornamental diamond divider (server component)
  section-header.tsx      # Shared numbered section header with mauve rule (server component)
  certifications.tsx      # 03/ Scroll-triggered Credly badge grid (8 certs)
  experience.tsx          # 01/ Professional Experience — featured ScribeAmerica card
  projects.tsx            # 02/ Things I've Built — DocDefend+, StudentPM, LightERP, CTF
  skills.tsx              # 04/ Technical Stack — 5 categorized pill rows
  education.tsx           # 05/ Education — MS MIS + BA Psychology with coursework
  animated-text.tsx       # Staggered word-by-word text reveal
  hero-speckles.tsx       # Cursor-reactive color dot field (dark mode only)
  scroll-progress.tsx     # Mauve scroll progress bar (CSS scroll-driven with JS fallback)
  page-transition.tsx     # Staggered fade-in-up page wrapper (reduced-motion safe)
  gallery/
    masonry-grid.tsx      # Masonry layout with sort + lightbox + progressive loading (12 at a time)
    photo-card.tsx        # Blur-up loading + scroll parallax + fade-in-up entrance
    sort-controls.tsx     # Styled sort dropdown (menu/menuitem ARIA)
  learn/
    learn-card.tsx        # Index page card (illustration + number + title + accent pills)
    learn-nav.tsx         # Prev/next navigation between artifacts (server component)
    artifact-error-boundary.tsx # Error boundary with editorial fallback + "Try again" button
    dynamic-artifacts.tsx # Client wrapper for ssr: false dynamic imports (Log Loss, PCA, Clustering, SHAP)
    gradient-descent.tsx  # 01/ Gradient Descent (4 sections: tangent line + drag, sparkline + compare, noise slider + smoothness, side-by-side GD vs GB)
    log-loss-cross-entropy.tsx # 02/ Log Loss & Cross-Entropy (4 sections: QQ + Shapiro-Wilk, sweep + multi-sample, info gain calc, hover-linked chain)
    pca.tsx               # 03/ PCA (5 sections: reconstruction + sweep, Kaiser criterion, before/after scatter, projection canvas, preset weights)
    regularization.tsx    # 04/ Regularization (2 sections: side-by-side Ridge/Lasso + sweep, bias-variance decomposition + canvas drag, linked lambda)
    clustering.tsx        # 05/ Clustering (3 sections: centroid trail + click-to-place, linkage toggle, interactive eps + cluster sparkline)
    shap.tsx              # 06/ SHAP (4 sections: feature value waterfall, click-highlight + correlation arrows, cumulative importance, subset lattice)
lib/
  hooks.ts                # Shared hooks: useHydrated(), useScrollReveal()
  styles.ts               # Shared accent style map (ACCENT_STYLES)
  types.ts                # Photo type definition (url, thumb?, date, camera, lens)
  badges.ts               # Credly API fetcher + manual badges, exports getAllBadges()
  learn/
    artifacts.ts          # Artifact metadata array: slug, title, description, subtopics, order
scripts/
  add-photo.mjs           # One-command photo addition: upload + thumbnail + photos.json update
  generate-thumbnails.mjs # Batch thumbnail generation for all photos (sharp, 1600px, mozjpeg q80)
public/
  photos.json             # Photo metadata (CloudFront URLs + thumb URLs, EXIF data)
  badges/                 # Non-Credly badge images (e.g. Zscaler, Snowflake)
next.config.ts            # Image remote patterns (CloudFront, Credly), experimental.viewTransition
netlify.toml              # Netlify build config + CSP, HSTS, cache headers
.nvmrc                    # Node version (20) for Netlify
```

## Photos

- Hosted on S3 via CloudFront: `https://d36t8s1mzbufg5.cloudfront.net/`
- Thumbnails (1600px, mozjpeg q80) at `https://d36t8s1mzbufg5.cloudfront.net/thumbs/`
- S3 bucket: `amirabdurrahim-photos`
- Metadata in `public/photos.json` (url, thumb, date, camera, lens)
- ~55 photos currently, multi-camera (Sony ILCE-6300/6700, Fujifilm X100VI) — brands derived dynamically from EXIF `camera` field in `masonry-grid.tsx` (prefixes: ILCE→Sony, X100/X-T/X-S→Fujifilm, NIKON→Nikon)
- Right-click disabled on gallery images
- Gallery grid uses thumbnails (~250KB), lightbox loads full-resolution originals (~10MB)
- To add photos: `node scripts/add-photo.mjs "/path/to/photo.jpg"` — auto-detects date from filename, guesses camera/lens from prefix, uploads original + thumb to S3, updates `photos.json`. Then commit and push.

## Security Headers

Configured in `netlify.toml`:
- **CSP:** `script-src 'self'` + SHA-256 hash of the inline dark-mode script. If the inline script in `layout.tsx` changes, recompute the hash: `echo -n "<script-content>" | openssl dgst -sha256 -binary | base64`
- **HSTS:** `max-age=63072000; includeSubDomains; preload`
- **Cache:** Immutable 1-year cache on `/_next/static/*`, 1-hour cache on `/badges/*`

## SEO

- `app/sitemap.ts` generates `/sitemap.xml` (homepage priority 1 monthly, gallery priority 0.8 weekly, learn index priority 0.8 monthly, 6 artifact pages priority 0.7 monthly)
- `app/robots.ts` generates `/robots.txt` (allow all, link to sitemap)
- JSON-LD `Person` schema in `layout.tsx` `<head>` (hardcoded object literal via `JSON.stringify`, no user input — safe)
- JSON-LD `LearningResource` schema on each `/learn/[slug]` page (rendered as `<script>` tag in JSX, not via metadata.other)
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
```

**Known lint error (pre-existing, not a regression):** 1 error in `interactive-headshot.tsx` (react-hooks/immutability — `animate` accessed before declaration). Safe to ignore.

## Certifications

- Badges fetched dynamically from Credly API at build time via `lib/badges.ts`
- `getAllBadges()` merges Credly badges + manual badges (e.g. Zscaler), sorts newest first
- Credly API: `https://www.credly.com/users/amir-abdur-rahim/badges.json` (revalidates daily, 5s AbortController timeout, runtime validation + filtering for malformed entries)
- Manual badges defined in `lib/badges.ts` `manualBadges` array — for non-Credly certs
- Zscaler badge image stored in `public/badges/zscaler-ztca.jpeg`, Snowflake in `public/badges/snowflake-snowpro-core.png`
- New Credly badges appear automatically on next build/revalidation
- To add a non-Credly badge: add entry to `manualBadges` in `lib/badges.ts`, put image in `public/badges/`
- Credly profile: `https://www.credly.com/users/amir-abdur-rahim`
