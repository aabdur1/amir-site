# amir-site

Personal website for Amir Abdur-Rahim at amirabdurrahim.com. Landing page (hero + 5 editorial resume sections) + photography gallery.

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
- **Dark mode via class toggle.** Uses `.dark` class on `<html>`. Custom variant defined in globals.css: `@custom-variant dark (&:where(.dark, .dark *));`. Blocking inline `<script>` in `layout.tsx` prevents flash of wrong theme on load. Toggle adds `.theme-transitioning` class for smooth 300ms crossfade.
- **No icon libraries.** Icons are inline SVGs.
- **Client components marked explicitly.** Components using `"use client"`: nav, dark-mode-toggle, hero, animated-text, hero-speckles, interactive-headshot, certifications, experience, projects, skills, education, footer, scroll-progress, page-transition. Gallery components (masonry-grid, photo-card, sort-controls) are also client components.
- **No shorthand/longhand mixing in inline styles.** Always fold `animationDelay` into the `animation` shorthand to avoid React warnings.

## Key Patterns

- **Shared hooks in `lib/hooks.ts`.** `useHydrated()` (hydration-safe boolean via `useSyncExternalStore`) and `useScrollReveal()` (IntersectionObserver with threshold 0.1, disconnect-after-first-intersection, returns `[ref, visible]`). Used by hero, footer, animated-text (hydrated) and all 5 section components (scroll reveal).
- **Shared components.** `SectionDivider` (server component, diamond ornament with `color` and `absolute` props) and `SectionHeader` (server component, numbered label + heading + mauve rule, receives `visible` prop). Used by all 5 section components + footer.
- **Shared accent styles in `lib/styles.ts`.** Unified `ACCENT_STYLES` map (sapphire, mauve, peach, lavender) with `bg`, `border`, `hoverBorder`, `dot`, `text` classes. Used by hero badges, skills pills, and project cards. Projects extends with local `STRIPE_STYLES` for top border color.
- **`next/image` for optimized images.** Headshot uses `fill` + `priority` (LCP element), badges use explicit `width/height`, gallery photos use `unoptimized` (direct CloudFront delivery — avoids `/_next/image` proxy overhead for ~50 large photos). Remote patterns configured in `next.config.ts` for CloudFront and Credly domains.
- **Blur-up image loading.** Gallery photo cards show a blurred placeholder and transition to the full image on load, using CSS filter transitions. Custom implementation (not `placeholder="blur"`) to avoid needing `blurDataURL` per remote image.
- **Branded OG images.** `app/opengraph-image.tsx` and `app/gallery/opengraph-image.tsx` generate 1200x630 PNGs at build time using `ImageResponse` from `next/og`. Catppuccin Mocha branding with DM Serif Display font loaded from Google Fonts gstatic (with try/catch fallback if font fetch fails). No hardcoded `images` in metadata — Next.js auto-injects from these routes.
- **Staggered page transitions.** `PageTransition` wraps each direct child with `fade-in-up` animation, 120ms stagger between sections. Tracks visited pages via module-level `Set` — first visit gets full stagger, return visits get a quick 200ms fade-in.
- **Per-element parallax.** Hero elements each have their own scroll speed (label fastest, badges slowest), creating a spread/dispersal effect on scroll. Uses refs + RAF + passive scroll listener — no state re-renders. Skipped entirely when `prefers-reduced-motion` is enabled.
- **Scroll-driven ref mutations (no re-renders).** Nav wordmark opacity and hero parallax both use direct `ref.style` mutations inside RAF callbacks instead of `setState`, avoiding React re-renders on every scroll frame.
- **Multi-accent hero badges.** Each hero badge pill has a distinct Catppuccin accent (sapphire, mauve, peach, lavender) with tinted background, colored dot, and matching hover border.
- **Cursor-reactive hero speckles (dark mode only).** `HeroSpeckles` renders viewport-proportional dots (40–250, reference 150 at 1920px) across the hero using Catppuccin Mocha accents (mauve, sapphire, peach, lavender). Count scales linearly with `window.innerWidth`, computed once on mount. Dots drift away from cursor (6px max) and glow brighter on approach. Hidden in light mode via `hidden dark:block`. Uses seeded PRNG for deterministic placement (smaller viewports render a subset of the same positions), RAF + lerp (0.06) + convergence check. Disabled on touch devices and with `prefers-reduced-motion`.
- **Cursor-reactive headshot.** `InteractiveHeadshot` tilts image toward cursor (3deg max) with dynamic shadow — cursor acts as light source. Uses perspective 3D transform + RAF + lerp. Disabled on touch devices.
- **RAF convergence checks.** `HeroSpeckles` and `InteractiveHeadshot` RAF loops stop automatically when lerp values converge (within 0.1px / 0.01deg), preventing infinite 60fps loops while cursor is stationary.
- **Parallax delayed start.** Hero parallax scroll listener attaches after 2.5s delay to avoid `style.transform` conflicting with CSS `fade-in-up` animation `forwards` fill during entrance animations.
- **Scroll progress bar.** `ScrollProgress` component shows a 2px mauve bar at the top of the viewport. Only renders on pages >2x viewport height (via ResizeObserver). RAF-gated scroll, fades in after first scroll.
- **Gallery count-up animation.** Photo count in gallery subtitle animates from 0 to target using RAF with cubic ease-out over 1.2s. Triggers on viewport entry via IntersectionObserver. Respects `prefers-reduced-motion`.
- **Numbered editorial sections.** Landing page sections use `01/`–`05/` numbered mono labels (peach accent number + slash separator). Sections alternate backgrounds: transparent → `bg-cream-dark/50 dark:bg-night-card/40` → transparent, etc. Each section has an ornamental diamond divider at top, display font heading, and mauve accent rule with `line-grow` animation.
- **Multi-accent section pills.** Experience, Projects, Skills, and Education sections reuse the hero badge pill pattern — accent-tinted `bg-{color}/10`, `border-{color}/25`, colored dot, badge font. Each section/category gets a distinct accent from the Catppuccin palette.

## Design System — Catppuccin Editorial

**Aesthetic:** Magazine/editorial typography on Catppuccin color palette. Latte (warm grey) for light mode, Mocha (deep purple) for dark.

**Color tokens (light — Catppuccin Latte):** Base (`#eff1f5`), Mantle (`#e6e9ef`), Surface0 (`#ccd0da`), Text (`#4c4f69`), Subtext1 (`#5c5f77` — `ink-subtle`, 5.57:1 AA), Subtext0 (`#6c6f85`), Overlay1 (`#8c8fa1`)

**Color tokens (dark — Catppuccin Mocha):** Base (`#1e1e2e`), Mantle (`#181825`), Surface0 (`#313244`), Text (`#cdd6f4`), Subtext0 (`#a6adc8`)

**Multi-accent system (Latte / Mocha):**
- Mauve (`#8839ef` / `#cba6f7`) — structural: rules, underlines, selection, active nav
- Peach (`#fe640b` / `#fab387`) — decorative: section numbers, ornaments, separators
- Sapphire (`#209fb5` / `#74c7ec`) — interactive: hover borders, footer link hovers
- Lavender (`#7287fd` / `#b4befe`) — ambient: headshot glow, moon icon, scroll indicator
- Rosewater (`#dc8a78` / `#f5e0dc`) — warm highlight: footer ornamental diamond. Note: `--color-gold-muted` in CSS is a legacy alias for this token.
- Yellow (`#df8e1d` / `#f9e2af`) — kept only for dark mode toggle sun icon

**Effects:** Grain texture overlay (SVG noise at 12% light / 4% dark), sharp editorial shadows, mauve text selection, cursor-reactive color speckles (dark mode only).

**Animations:** `fade-in`, `fade-in-up`, `scale-in`, `dropdown-in`, `line-grow` (mauve accent rule), `shimmer` (scroll indicator), `float` (scroll line bob). Dark mode toggle: `icon-swap-in` (springy pop), `sun-spin`, `moon-rock`, `sun-glow` (gold), `moon-glow` (lavender). Staggered delays throughout hero and all landing page sections (experience, projects, certifications, skills, education).

**Utility classes:** `btn-lift` (hover lift with spring overshoot), `card-hover` (hover lift + elevated shadow). Spring easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for hover entry, `cubic-bezier(0.22, 1, 0.36, 1)` for settle-back.

**CSS-based nav animations:** `.nav-wordmark::after` (mauve underline sweep), `.nav-gallery-pill::before` (sapphire fill sweep), `.hero-line` (gradient vertical line). All use CSS `transform: scaleX()` transitions.

## Mobile & Accessibility

- **320px (iPhone SE) safe.** Nav name scales `text-lg sm:text-2xl md:text-3xl` with `min-w-0`. Hero badges shrink `text-[12px] sm:text-[13px]` with `px-3 sm:px-4`. Cert grid goes single-column below 375px (`grid-cols-1 min-[375px]:grid-cols-2`).
- **Touch targets ≥ 44px.** Footer links, Credly link, and sort dropdown options all have `py-3` padding. Social icon buttons and dark mode toggle are `w-11 h-11` (44px) with `gap-2` (8px) spacing.
- **WCAG AA contrast.** Body/label text uses `text-ink-subtle` (5.57:1 on Latte Base) instead of `text-ink-muted` (3.73:1). `text-ink-muted` reserved for decorative icon colors only. Minimum text size 12px (no `text-[10px]` or `text-[11px]` on readable content).
- **Global focus ring.** `:focus-visible` shows 2px mauve outline with 3px offset (dark mode uses `mauve-dark`). Applied site-wide via `globals.css`.
- **`prefers-reduced-motion` supported.** Global CSS media query kills all animation durations/iterations. Hero parallax scroll listener is skipped entirely. `PageTransition` renders without `opacity: 0` start state. Gallery count-up shows final number immediately. Cursor effects gated behind `(pointer: fine)`.
- **Gallery keyboard accessible.** Photo cards have `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), and `aria-label` with photo metadata. Sort dropdown uses `role="menu"`/`role="menuitem"` with `aria-label="Sort photos by"`.
- **Decorative elements hidden from screen readers.** All decorative SVGs (nav arrow, scroll progress, hero speckles, social icons, card arrows, sort chevron, dark mode toggle icons) use `aria-hidden="true"` and `focusable="false"`.
- **External link labels.** All `target="_blank"` links include "(opens in new tab)" in `aria-label`.
- **`-webkit-tap-highlight-color: transparent`** on all `a` and `button` elements for clean mobile taps.
- **`100dvh` for hero.** Uses dynamic viewport height to account for mobile browser chrome. Hero top padding reduced on mobile (`pt-8 pb-20 sm:py-20`) so badges are visible above the fold.
- **Scroll indicator hidden on mobile.** The "Scroll" text + bobbing line is `hidden sm:flex` — only visible at 640px+ where it serves as a visual cue on full-viewport hero layouts.
- **Hero decorative line hidden on mobile.** The vertical accent line (`hero-line`) is `hidden sm:block` — only visible at 640px+ where left margin clears content.
- **`overflow-x: hidden` on body.** Prevents accidental horizontal scroll.

## File Structure

```
app/
  layout.tsx              # Root layout, fonts (4 families), metadata, nav, footer, scroll progress
  not-found.tsx           # Custom 404 page (editorial "wandered off the map")
  opengraph-image.tsx     # Branded OG image (Catppuccin Mocha, 1200x630)
  page.tsx                # Landing: Hero, Experience, Projects, Certifications, Skills, Education
  globals.css             # @theme tokens, keyframes, utility classes, theme transitions
  gallery/
    opengraph-image.tsx   # Gallery OG image (Catppuccin Mocha, 1200x630)
    page.tsx              # Photography gallery page
components/
  nav.tsx                 # Sticky nav: wordmark hidden on home until scroll, gallery pill, thin rule
  footer.tsx              # Editorial footer: name, tagline, links, diamond ornaments
  dark-mode-toggle.tsx    # Animated sun/moon toggle with smooth theme crossfade
  hero.tsx                # Asymmetric hero: animated name, headshot, badges, parallax
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
  scroll-progress.tsx     # Mauve scroll progress bar (auto-hides on short pages)
  page-transition.tsx     # Staggered fade-in-up page wrapper (reduced-motion safe)
  gallery/
    masonry-grid.tsx      # Masonry layout with sort + lightbox + count-up animation
    photo-card.tsx        # Blur-up loading + scroll reveal + hover + zoom-in cursor
    sort-controls.tsx     # Styled sort dropdown (menu/menuitem ARIA)
lib/
  hooks.ts                # Shared hooks: useHydrated(), useScrollReveal()
  styles.ts               # Shared accent style map (ACCENT_STYLES)
  types.ts                # Photo type definition
  badges.ts               # Credly API fetcher + manual badges, exports getAllBadges()
public/
  photos.json             # Photo metadata (CloudFront URLs, EXIF data)
  badges/                 # Non-Credly badge images (e.g. Zscaler, Snowflake)
next.config.ts            # Image remote patterns (CloudFront, Credly)
netlify.toml              # Netlify build config + security headers
.nvmrc                    # Node version (20) for Netlify
```

## Photos

- Hosted on S3 via CloudFront: `https://d36t8s1mzbufg5.cloudfront.net/`
- Metadata in `public/photos.json` (URL, date, camera, lens)
- ~50 photos currently, multi-camera (Sony, Fujifilm, Nikon) — brands derived dynamically from EXIF `camera` field in `masonry-grid.tsx`
- Right-click disabled on gallery images
- To add photos: append entries to `photos.json` with S3 URL and EXIF metadata

## Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Serve production build locally
npm run lint      # ESLint (flat config via eslint.config.mjs, not next lint)
```

**Known lint errors (pre-existing, not regressions):** 2 errors in `interactive-headshot.tsx` (react-hooks/immutability — `animate` accessed before declaration) and `page-transition.tsx` (react-hooks/set-state-in-effect). These are safe to ignore.

## Certifications

- Badges fetched dynamically from Credly API at build time via `lib/badges.ts`
- `getAllBadges()` merges Credly badges + manual badges (e.g. Zscaler), sorts newest first
- Credly API: `https://www.credly.com/users/amir-abdur-rahim/badges.json` (revalidates daily)
- Manual badges defined in `lib/badges.ts` `manualBadges` array — for non-Credly certs
- Zscaler badge image stored in `public/badges/zscaler-ztca.jpeg`, Snowflake in `public/badges/snowflake-snowpro-core.png`
- New Credly badges appear automatically on next build/revalidation
- To add a non-Credly badge: add entry to `manualBadges` in `lib/badges.ts`, put image in `public/badges/`
- Credly profile: `https://www.credly.com/users/amir-abdur-rahim`
